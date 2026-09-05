# Настоящие провайдеры на нашем контракте

> English version: [real-world-providers.md](./real-world-providers.md)

Пять плагинов в этом репозитории списаны с реальных интеграций. Здесь — сами реальные:
что возвращают Stripe, Adyen, PayPal, Apple Pay, Google Pay и банковский эквайринг, и какой
`PaymentAction` вернул бы плагин в каждом случае.

Сначала прочитайте [Как написать платёжный плагин](./plugin-authoring.ru.md). Здесь уже
предполагается, что вы знаете, что такое `confirm`, `resume`, действие и evidence.

## Одно правило до примеров

**Плагин работает в браузере, значит секретного ключа у него быть не может.**

`sk_...` у Stripe, `x-api-key` у Adyen, client secret у PayPal, `userName`/`password` у банка
— всё это живёт на сервере. Плагин зовёт _ваш_ бэкенд, а он уже — провайдера:

```text
браузер: плагин  →  ваш API  →  API провайдера
```

Всё ниже описывает то, что ваш API отдаёт плагину. Формы ответов настоящие: бэкенд обычно
пробрасывает их как есть, вырезав секреты.

В демо в этом репозитории бэкенда нет вообще, поэтому мок отвечает сразу в форме провайдера.
Это единственное место, где всё устроено не как в проде.

## Карта

| Провайдер и флоу              | инструмент | действие         | surface  | чем завершается |
| ----------------------------- | ---------- | ---------------- | -------- | --------------- |
| Stripe, redirect next action  | `card`     | `redirect`       | `top`    | `return_url`    |
| Stripe, Elements + Stripe.js  | `none`     | `sdk_handoff`    | `none`   | `sdk_callback`  |
| Stripe Checkout               | `none`     | `redirect`       | `top`    | `return_url`    |
| Adyen, `action.type=redirect` | `card`     | `redirect`       | `top`    | `return_url`    |
| Adyen, `action.type=threeDS2` | `card`     | `sdk_handoff`    | `none`   | `sdk_callback`  |
| Adyen Drop-in                 | `none`     | `sdk_handoff`    | `none`   | `sdk_callback`  |
| PayPal buttons                | `none`     | `sdk_handoff`    | `none`   | `sdk_callback`  |
| PayPal redirect               | `none`     | `redirect`       | `top`    | `return_url`    |
| Apple Pay / Google Pay        | `none`     | `sdk_handoff`    | `none`   | `sdk_callback`  |
| Банк host-to-host, 3-D Secure | `card`     | `redirect`       | `iframe` | `post_message`  |
| Hosted-поля провайдера        | `none`     | `collect_fields` | `inline` | `post_message`  |

## Stripe

У Stripe три распространённых сценария, и они используют три разных действия.

### 1. Подтверждает сервер, покупателя редиректит

Ваш бэкенд создаёт и подтверждает PaymentIntent. Если платежу нужен ещё шаг, Stripe вернёт
`status: 'requires_action'` и объект `next_action`. Когда `next_action.type` равен
`redirect_to_url`, в нём лежит URL, куда надо отправить браузер.

```ts
// внутри confirm()
const intent = await http.post<StripeIntentDto>(`/payments/${intentId}/confirm`, {
  paymentMethodId: instrument.kind === 'card' ? await tokenize(instrument) : undefined,
})

if (intent.status === 'requires_action' && intent.next_action?.type === 'redirect_to_url') {
  return {
    status: 'requires_action',
    intent: toIntent(intent),
    action: {
      id: intent.id,
      kind: 'redirect',
      purpose: 'authenticate',
      surface: 'top',
      url: intent.next_action.redirect_to_url.url,
      method: 'GET',
      // Stripe уже знает ваш return URL, подставлять некуда. Заполните это поле, если
      // ваш бэкенд пробрасывает URL сам.
      completion: { via: 'return_url' },
    },
  }
}
```

`resume` не смотрит на то, что написано в URL возврата, и перечитывает PaymentIntent:

```ts
resume: async (intentId, evidence, opts) => {
  // ?payment_intent=pi_123&redirect_status=succeeded приезжает через адресную строку.
  const intent = await http.get<StripeIntentDto>(`/payments/${intentId}`, opts)
  return toResult(intent)
}
```

### 2. Elements, подтверждает Stripe.js в браузере

В Elements поля карты — это собственные iframe'ы Stripe, которые Stripe.js монтирует в
переданный вами узел. URL, на который можно направить iframe, вам не дают, поэтому это
**не** `collect_fields`. Всем подтверждением管 управляет Stripe.js, а значит это
`sdk_handoff`:

```ts
return {
  status: 'requires_action',
  intent: toIntent(intent),
  action: {
    id: intent.id,
    kind: 'sdk_handoff',
    purpose: 'authorize',
    surface: 'none',
    sdk: 'stripe',
    scriptUrl: 'https://js.stripe.com/v3/',
    completion: { via: 'sdk_callback' },
    params: { clientSecret: intent.client_secret, publishableKey: ctx.config.publishableKey },
  },
}
```

Хост регистрирует под это один адаптер:

```ts
sdk: {
  adapters: [
    {
      sdk: 'stripe',
      request: async (params) => {
        const stripe = window.Stripe(params.publishableKey)
        const result = await stripe.handleNextAction({ clientSecret: params.clientSecret })
        if (result.error) throw new Error(result.error.message)
        return { paymentIntentId: result.paymentIntent.id }
      },
    },
  ],
}
```

`stripe.confirmPayment` по умолчанию редиректит на `return_url`. Опция
`redirect: 'if_required'` оставляет процесс на странице, когда способ оплаты это позволяет —
именно поэтому здесь работает `sdk_callback`, а не `return_url`.

### 3. Stripe Checkout

Страницу целиком хостит Stripe. Бэкенд создаёт Checkout Session и отдаёт её `url`:

```ts
action: {
  id: session.id,
  kind: 'redirect',
  purpose: 'authorize',
  surface: 'top',
  url: session.url,
  method: 'GET',
  completion: { via: 'return_url' },
}
```

Это ровно та же форма, что у `@checkout-kit/provider-hpp` в этом репозитории.

### Маппинг статусов

| Статус Stripe             | статус домена                                              |
| ------------------------- | ---------------------------------------------------------- |
| `succeeded`               | `succeeded`                                                |
| `processing`              | `processing`                                               |
| `requires_action`         | `requires_action`                                          |
| `requires_payment_method` | `declined` после попытки, `requires_payment_method` до неё |
| `canceled`                | `canceled`                                                 |

Осторожнее всего с `requires_payment_method`: после неудачного подтверждения он означает,
что карту отклонили, а причина лежит в `last_payment_error`.

## Adyen

`/payments` у Adyen либо завершает платёж, либо возвращает объект `action`. Он ложится на наш
почти поле в поле.

### `action.type: 'redirect'`

```json
{
  "resultCode": "RedirectShopper",
  "action": {
    "type": "redirect",
    "method": "POST",
    "url": "https://test.adyen.com/hpp/3d/validate.shtml",
    "data": { "PaReq": "eNpVUtt...", "MD": "eyJ0aHJ...", "TermUrl": "..." }
  }
}
```

```ts
action: {
  id: paymentData,
  kind: 'redirect',
  purpose: 'authenticate',
  surface: 'top',
  url: adyen.action.url,
  method: adyen.action.method,
  fields: adyen.action.data,
  // Adyen обычно кладёт ваш URL возврата в запрос. Если бэкенд пробрасывает его сам,
  // назовите поле здесь, и хост его заполнит.
  returnUrlField: 'TermUrl',
  completion: { via: 'return_url' },
}
```

Покупатель возвращается с `redirectResult` в query. `resume` отправляет его дальше:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'return_url') return unsupported(evidence)

  const details = await http.post<AdyenResultDto>(
    '/payments/details',
    {
      details: { redirectResult: evidence.params.redirectResult },
    },
    opts,
  )

  return toResult(details)
}
```

### `action.type: 'threeDS2'`

Нативный 3-D Secure 2 ведёт собственный JavaScript Adyen, поэтому это `sdk_handoff` с
`sdk: 'adyen'`. Адаптер создаёт компонент из `action` и резолвится тем `state.data`, который
компонент отдал; `resume` отправляет это в `/payments/details`.

### Drop-in

Drop-in рисует все способы оплаты сам. Инструмент — `none`, действие — `sdk_handoff`, а
`resume` отправляет то, что вернул компонент.

### Коды результата

| `resultCode` Adyen                                       | статус домена     |
| -------------------------------------------------------- | ----------------- |
| `Authorised`                                             | `succeeded`       |
| `Refused`, `Error`                                       | `declined`        |
| `Pending`, `Received`                                    | `processing`      |
| `RedirectShopper`, `IdentifyShopper`, `ChallengeShopper` | `requires_action` |
| `Cancelled`                                              | `canceled`        |

Показывать надо `refusalReason` — это формулировка эмитента, ровно то, что контракт и просит
пробрасывать.

## PayPal

В Orders v2 два шага, между которыми стоит покупатель: создать заказ, дать его одобрить,
затем захватить. **Деньги забирает capture**, поэтому именно его должен делать `resume`:
одобрение само по себе никого не списало.

С JS SDK (кнопки PayPal) одобрение происходит в попапе, которым владеет SDK:

```ts
action: {
  id: order.id,
  kind: 'sdk_handoff',
  purpose: 'authorize',
  surface: 'none',
  sdk: 'paypal',
  scriptUrl: `https://www.paypal.com/sdk/js?client-id=${ctx.config.clientId}&currency=USD`,
  completion: { via: 'sdk_callback' },
  params: { orderId: order.id },
}
```

```ts
resume: async (intentId, evidence, opts) => {
  // SDK говорит, что покупатель одобрил. Доказывает что-то только capture.
  const capture = await http.post<PayPalOrderDto>(`/paypal/orders/${intentId}/capture`, {}, opts)
  return toResult(capture)
}
```

Без SDK берите ссылку `approve` из заказа, отдавайте `redirect` с `surface: 'top'` — и точно
так же делайте capture в `resume`.

## Apple Pay и Google Pay

Оба — кошельки: скрипт рисует свой лист, покупатель подтверждает отпечатком или лицом, а вы
получаете зашифрованный токен, который списывает ваш PSP. Это `sdk_handoff`, и именно с этого
списан `@checkout-kit/provider-wallet`.

```ts
action: {
  id: intentId,
  kind: 'sdk_handoff',
  purpose: 'authorize',
  surface: 'none',
  sdk: 'google-pay',
  scriptUrl: 'https://pay.google.com/gp/p/js/pay.js',
  completion: { via: 'sdk_callback' },
  params: { merchantId, amount: intent.amount, currency: intent.currency },
}
```

Адаптер Google Pay зовёт `paymentsClient.loadPaymentData(request)` и резолвится
`paymentData.paymentMethodData.tokenizationData.token`. Адаптер Apple Pay создаёт
`ApplePaySession`, ждёт `onpaymentauthorized` и резолвится `event.payment.token`.

Две вещи про Apple Pay, о которых легко забыть:

- нужен HTTPS и файл подтверждения домена, отдаваемый с вашего сайта, поэтому на моковом
  бэкенде его не показать
- `ApplePaySession.canMakePayments()` говорит, стоит ли вообще предлагать этот способ, — эта
  проверка живёт в вашем UI, а не в плагине

В обоих случаях `resume` отправляет токен на ваш бэкенд, а тот списывает через PSP.

## Банковский эквайринг host-to-host

Это форма, которой следует `@checkout-kit/provider-acquiring`: старое API, form-urlencoded, с
кредами в теле каждого вызова. Несколько банковских платформ в Европе и СНГ до сих пор так
работают.

```text
register.do                 создать заказ, получить orderId
paymentorder.do             отправить карту; получить результат либо acsUrl + PaReq + MD
<покупатель проходит аутентификацию на acsUrl>
finish3ds.do                отправить PaRes и MD
getOrderStatusExtended.do   прочитать настоящий исход
```

Три детали, которых стоит ждать от этого семейства API:

- **`errorCode` внутри HTTP 200.** Отклонённая карта — это _успешный_ запрос со статусом
  заказа 6. Ненулевой `errorCode` означает, что не удался сам запрос: плохие креды, неизвестный
  заказ. Спутать одно с другим — классическая ошибка.
- **числовые статусы.** `orderStatus` от 0 до 6, плагин переводит их в имена домена. Два
  схлопываются: `authorized` и `refunded` в этом домене нет.
- **3-D Secure 1.** `PaReq` уходит формой на access control server банка, а `TermUrl`
  говорит, куда вернуть браузер. Ставьте `returnUrlField: 'TermUrl'` и пусть хост его
  заполнит.

## Hosted-поля провайдера

Некоторые провайдеры дают URL, который вы рендерите в iframe, и присылают токен через
`postMessage`. Для этого и нужен `collect_fields`, и это делает `@checkout-kit/provider-hosted-fields`.

Обратите внимание на отличие от Stripe Elements: Elements — это _скрипт_, который сам создаёт
свои iframe'ы и сам подтверждает платёж, поэтому там `sdk_handoff`. Обычная hosted-fields
страница — это _URL_, который вы рендерите, поэтому `collect_fields`. Дали скрипт — handoff,
дали URL — поля.

## Как выбрать вид действия

1. Провайдер даёт URL, куда должен пойти покупатель? → `redirect`
   (`surface: 'top'`, если ему нужно всё окно, `'iframe'`, если его можно вложить)
2. Даёт URL, который рисует поля внутри вашей страницы? → `collect_fields`
3. Даёт скрипт, который всё делает сам? → `sdk_handoff`
4. От покупателя ничего не нужно, нужно просто время? → `poll`

Если ничто не подошло — это повод обсудить, а не сразу добавлять пятый вид. Все перечисленные
здесь интеграции укладываются в четыре.
