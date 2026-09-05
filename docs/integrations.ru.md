# Интеграция настоящего платёжного SDK

> English version: [integrations.md](./integrations.md)

Как каждый популярный провайдер ложится на контракт — в одном месте, чтобы их можно было
сравнить. Сначала прочитайте [Как написать платёжный плагин](./plugin-authoring.ru.md) —
там про `confirm`, `resume`, действия и evidence, — и
[Бэкенд, с которым говорит плагин](./backend.ru.md) про половину, где лежат ключи.

Каждый раздел ниже устроен одинаково: **что даёт SDK → какой вид действия → какой раннер его
исполняет → что объявить → что нужно на сервере**.

## Одно правило, до всех остальных

**Плагин работает в браузере, поэтому секретного ключа у него не бывает.** Stripe `sk_`,
Adyen `x-api-key`, client secret у PayPal, `userName`/`password` у банка — всё это живёт на
вашем сервере. Плагин зовёт ваш API, ваш API — провайдера.

Там, где у SDK есть _публикуемый_ ключ (`pk_`, client token у Braintree, client key у
Adyen), он в браузере уместен: он умеет начать платёж, но не двигать деньги.

## Карта

| Провайдер                      | Что даёт                         | Вид действия               | surface        | Чем завершается |
| ------------------------------ | -------------------------------- | -------------------------- | -------------- | --------------- |
| Stripe, редирект в next action | `next_action.redirect_to_url`    | `redirect`                 | `top`          | `return_url`    |
| Stripe.js / Elements           | скрипт, который сам подтверждает | `sdk_handoff`              | `none`         | `sdk_callback`  |
| Stripe Checkout                | хостед-URL                       | `redirect`                 | `top`          | `return_url`    |
| Adyen `action.type=redirect`   | url + method + data              | `redirect`                 | `top`          | `return_url`    |
| Adyen `action.type=threeDS2`   | токен для своего SDK             | `sdk_handoff`              | `none`         | `sdk_callback`  |
| Adyen Drop-in                  | скрипт, рисующий всё             | `sdk_handoff`              | `none`         | `sdk_callback`  |
| Braintree                      | client token, затем nonce        | `sdk_handoff`              | `none`         | `sdk_callback`  |
| Checkout.com Frames            | iframe у вас на странице         | `collect_fields`           | `inline`       | `post_message`  |
| Кнопки PayPal                  | скрипт со своей кнопкой          | `sdk_handoff`              | `none`         | `sdk_callback`  |
| PayPal редиректом              | ссылка на подтверждение          | `redirect`                 | `top`          | `return_url`    |
| Apple Pay / Google Pay         | шторка от ОС                     | `sdk_handoff`              | `none`         | `sdk_callback`  |
| Klarna                         | хостед-страница или виджет       | `redirect` / `sdk_handoff` | `top` / `none` | `return_url`    |
| Банк host-to-host + 3-D Secure | форма для POST                   | `redirect`                 | `iframe`       | `post_message`  |
| PIX / UPI / BLIK               | QR-строка или код                | `display`                  | `inline`       | `poll`          |

Закономерность за таблицей: **URL — это `redirect`, скрипт — `sdk_handoff`, URL, рисующий
поля, — `collect_fields`, код для показа — `display`, а «делать нечего, только ждать» —
`poll`.**

## Stripe

Две интеграции, которые стоит иметь, и они разной формы.

**Payment Intents с редиректом.** Ваш сервер подтверждает и отдаёт `next_action`:

```ts
confirm: async (intentId, instrument, opts) => {
  const dto = await http.post<PaymentDto>(`/payments/${intentId}/confirm`, {
    // Карта, набранная в вашей форме; или `{ paymentMethodId }` для сохранённой.
    card: instrument.kind === 'card' ? { number: instrument.number, ... } : undefined,
  }, { signal: opts.signal })

  if (dto.nextAction?.type === 'redirect_to_url') {
    return {
      status: 'requires_action',
      intent: toIntent(dto),
      action: {
        id: dto.nextAction.id,
        kind: 'redirect',
        purpose: 'authenticate',
        surface: 'top',
        url: dto.nextAction.url,
        method: 'GET',
        returnUrlField: 'return_url',
        completion: { via: 'return_url' },
      },
    }
  }

  return toResult(dto)
}
```

`returnUrlField` важен: базу знает только хост, поэтому абсолютный URL возврата подставляет
движок. Собранный в плагине URL сломается в тот день, когда приложение задеплоят в подпуть.

На обратном пути `resume` **перечитывает интент**, а не верит query string.

**Stripe.js и Elements** — другая форма: скрипт монтирует свои iframe и подтверждает платёж
сам. Это `sdk_handoff` с `surface: 'none'`, и адаптер регистрирует хост, а не плагин:

```ts
createBrowserRuntime({
  returnPath: '/payment/return',
  sdk: {
    adapters: [
      {
        sdk: 'stripe',
        request: async (params) => {
          const stripe = await loadStripe(publishableKey)
          const result = await stripe.confirmPayment({
            clientSecret: params.clientSecret as string,
            confirmParams: { return_url: window.location.origin + '/payment/return' },
            redirect: 'if_required',
          })
          if (result.error) throw new Error(result.error.message)
          return { paymentIntentId: result.paymentIntent.id }
        },
      },
    ],
  },
})
```

`capabilities`: `instruments: ['card', 'token']`, `actions: ['redirect']` (или
`['sdk_handoff']` для Elements), `surfaces: ['top']`, `poll: true`, `idempotency: 'header'`.

Серверу нужны: создание, подтверждение, чтение и вебхук `payment_intent.succeeded`. Ключ
`Idempotency-Key` от плагина передавайте в Stripe как есть.

## Adyen

Adyen отвечает на `/payments` объектом `action`. Его `type` и есть всё решение:

```ts
switch (dto.action?.type) {
  case 'redirect':
    return {
      status: 'requires_action',
      intent,
      action: {
        id: dto.action.paymentData,
        kind: 'redirect',
        purpose: 'authenticate',
        surface: 'top',
        url: dto.action.url,
        method: dto.action.method,
        fields: dto.action.data,
        completion: { via: 'return_url' },
      },
    }

  case 'threeDS2':
    // Adyen хочет, чтобы отпечаток или челлендж делал его собственный SDK.
    return {
      status: 'requires_action',
      intent,
      action: {
        id: dto.action.paymentData,
        kind: 'sdk_handoff',
        purpose: 'authenticate',
        surface: 'none',
        sdk: 'adyen',
        params: { token: dto.action.token, subtype: dto.action.subtype },
        completion: { via: 'sdk_callback' },
      },
    }
}
```

`resume` отправляет собранные `details` в `/payments/details` через ваш сервер.

**Drop-in** — это один `sdk_handoff` на весь платёж: Adyen рисует список методов, поля и
аутентификацию. Плагин при этом делает очень мало, и в этом смысл.

`capabilities`: `actions: ['redirect', 'sdk_handoff']`, `surfaces: ['top', 'none']`,
`authentication: ['3ds1', '3ds2']`.

## Braintree

Client token с вашего сервера, потом SDK делает payment method nonce, потом ваш сервер
списывает по nonce. Всё это — один `sdk_handoff`:

```ts
{ kind: 'sdk_handoff', surface: 'none', sdk: 'braintree',
  scriptUrl: 'https://js.braintreegateway.com/web/dropin/1.44.0/js/dropin.min.js',
  integrity: 'sha384-…',
  params: { clientToken: dto.clientToken, amount: dto.amount },
  completion: { via: 'sdk_callback' } }
```

Раннер грузит скрипт один раз, сколько бы платежей его ни попросили, уважает `integrity` и
не ждёт вечно. Адаптер возвращает `{ nonce }`, а `resume` отправляет его на ваш сервер.

## Checkout.com Frames

URL, который рисует поля карты внутри вашей страницы и отвечает через `postMessage`. Это
`collect_fields`:

```ts
{ kind: 'collect_fields', surface: 'inline',
  url: 'https://frames.example.com/fields',
  origin: 'https://frames.example.com',
  fields: ['number', 'exp', 'cvc'],
  completion: { via: 'post_message', origin: 'https://frames.example.com', type: 'card-tokenized' } }
```

Раннер сажает фрейм в песочницу без `allow-forms` и без навигации верхнего уровня и на
каждое сообщение проверяет три вещи: origin, тип и id действия. Пришедший токен меняется на
списание **на вашем сервере** — в браузере всегда лежит только токен.

## PayPal

**Кнопки** — это `sdk_handoff`: скрипт рисует собственную кнопку PayPal, открывает своё окно
и отдаёт id заказа. Адаптер регистрируется с вашим client id.

**Редирект** — более старая форма: сервер создаёт заказ, PayPal возвращает ссылку на
подтверждение, и это `redirect` с `surface: 'top'`, завершающийся `return_url`. Дальше ваш
сервер делает capture — `resume` не должен считать сам возврат оплатой.

## Apple Pay и Google Pay

Оба — `sdk_handoff` с `surface: 'none'`: шторку рисует ОС, вашего не рендерится ничего. Две
вещи только ваши:

- **Валидация мерчанта** (Apple Pay) серверная по определению: домен должен быть
  зарегистрирован, а сессия подписана вашим сертификатом.
- **Payload уходит провайдеру с вашего сервера.** В браузере лежит зашифрованный блоб,
  который он не может открыть, — и не должен пытаться.

В React Native берите их нативно, а не в WebView — см. [гайд по WebView](./webview.ru.md).

## Klarna и другие «плати потом»

Обычно хостед-страница (`redirect`, `surface: 'top'`, `return_url`), иногда виджет
(`sdk_handoff`). От карты отличаются двумя вещами:

- Исход может быть `processing` на минуты. Объявляйте `poll: true` и дайте движку подождать
  — или пусть вебхук досеттлит, а покупатель узнает письмом.
- Сумма и состав корзины должны совпадать с авторизованными. Присылайте id плана, а не цену
  из браузера.

## QR и коды

PIX, UPI, BLIK, PromptPay, Konbini: ваш сервер просит у провайдера код, а покупатель платит
его там, куда вы не видите. Это действие `display`, завершающееся `poll`, и
`@checkout-kit/provider-bank-transfer` в этом репозитории — рабочий плагин ровно такой формы.
См. [«Показать код и ждать»](./providers/asia.ru.md#показать-код-и-ждать).

## Чек-лист для любого из них

1. Напишите плагин по контракту и прогоните contract-набор `describeProviderContract` —
   до того, как писать UI.
2. Объявите в `capabilities.instruments` ровно то, что принимает `confirm`. Набор проверяет
   обе стороны, а чекаут строит по этому списку форму.
3. Никогда не собирайте URL возврата в плагине. Называйте поле через `returnUrlField`.
4. `confirm` и `resume` не бросают. Любой сбой — `{ status: 'error' }`.
5. Evidence — подсказка. Перечитайте платёж со своего сервера, прежде чем сказать, что всё
   прошло.
6. Пробрасывайте ключ идемпотентности провайдеру.
7. Возвращайте сообщение эмитента его словами.
