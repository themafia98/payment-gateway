# Америка: провайдеры и банки

> English version: [americas.md](./americas.md)

Сначала прочитайте [Настоящие провайдеры на нашем контракте](../real-world-providers.ru.md).

## Как устроен регион

США — карточный рынок. Большинство платежей — это карта и ничего больше, и до недавнего
времени многие из них даже не спрашивали 3-D Secure: эмитенты там полагаются на скоринг, а не
на челлендж при каждой покупке. Поэтому чекаут только под США часто идёт
`confirm` → `succeeded` вообще без действий, а вся интересная работа — в кошельках и
сохранённых картах.

Латинская Америка — наоборот: там правят локальные методы. PIX в Бразилии, OXXO в Мексике,
Boleto и рассрочка на картах («cuotas»), о которой чекаут из США никогда не слышал.

## Карта

| Провайдер               | Где                  | Схема                         | Действие                   |
| ----------------------- | -------------------- | ----------------------------- | -------------------------- |
| Stripe                  | US, CA, LATAM        | PaymentIntent + `next_action` | `redirect` / `sdk_handoff` |
| Braintree               | US, CA               | client token + nonce          | `sdk_handoff`              |
| PayPal                  | везде                | order + approve + capture     | `sdk_handoff` / `redirect` |
| Square                  | US, CA               | Web Payments SDK + токен      | `sdk_handoff`              |
| Authorize.Net           | US, давние продавцы  | токен Accept.js               | `sdk_handoff`              |
| Adyen                   | крупный бизнес       | объект `action`               | `redirect` / `sdk_handoff` |
| Cybersource             | крупный бизнес, Visa | host-to-host + 3-D Secure     | `redirect`                 |
| Worldpay / FIS          | крупный бизнес       | hosted page или host-to-host  | `redirect`                 |
| Fiserv, Global Payments | их перепродают банки | hosted page                   | `redirect`                 |
| dLocal, EBANX           | LATAM                | платёж + редирект или ваучер  | `redirect` / показ кода    |
| Mercado Pago            | LATAM                | preference + init point       | `redirect` / `sdk_handoff` |

## Braintree и Square: сначала токен, потом списание

Оба работают по одной идее, и именно её стоит понять для рынка США: их JavaScript собирает
карту в своих полях и отдаёт вам **одноразовый токен**. Списывает его ваш бэкенд. Карта не
касается вашего кода.

Braintree:

```ts
action: {
  id: intentId,
  kind: 'sdk_handoff',
  purpose: 'collect',
  surface: 'none',
  sdk: 'braintree',
  scriptUrl: 'https://js.braintreegateway.com/web/dropin/1.44.0/js/dropin.min.js',
  completion: { via: 'sdk_callback' },
  params: { clientToken: session.clientToken, amount: intent.amount },
}
```

Адаптер создаёт Drop-in, ждёт покупателя и резолвится `{ nonce: payload.nonce }`. Дальше:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'sdk_callback') return unsupported(evidence)
  const { nonce } = evidence.payload as { nonce: string }
  // Бэкенд зовёт transaction.sale с этим nonce — приватный ключ у него.
  return toResult(await http.post(`/braintree/charges/${intentId}`, { nonce }, opts))
}
```

Square — то же самое другими словами: `payments.card()`, `card.tokenize()` и `sourceId`
вместо nonce.

Accept.js у Authorize.Net — та же форма и более старое API: он возвращает объект
`opaqueData`, который бэкенд отправляет как источник платежа.

## Кошельки

Apple Pay и Google Pay везде дают один и тот же `sdk_handoff` — см.
[основную страницу маппинга](../real-world-providers.ru.md#apple-pay-и-google-pay). Две
региональные заметки:

- В США кошельки — заметная доля мобильных чекаутов. Решение, _показывать ли кнопку_, живёт в
  вашем UI (`ApplePaySession.canMakePayments()`, `paymentsClient.isReadyToPay()`), а не в
  плагине.
- Оба отдают токен, который списывает PSP. Поэтому «плагин кошелька» обычно тонкая прослойка
  перед Stripe, Braintree или Adyen, а не самостоятельная интеграция.

## Латинская Америка

**PIX (Бразилия)** — мгновенный банковский перевод по QR-коду или строке для копирования.
Покупатель открывает банковское приложение, платит, и бэкенд узнаёт об этом через секунды.
Редиректить некуда и собирать нечего: вы показываете код и ждёте. Это действие `display` —
см. [«Показать код и ждать»](./asia.ru.md#показать-код-и-ждать), здесь всё один в один, а
`@checkout-kit/provider-bank-transfer` — готовый плагин ровно такой формы.

**OXXO и Boleto** — ваучеры. Покупатель получает квитанцию или штрихкод и платит наличными в
магазине, иногда через несколько дней. Подходит то же действие `display` с
`format: 'instructions'`, только ждать столько на странице невозможно: покажите квитанцию, а
результат сообщайте письмом.

**Рассрочка** на картах LATAM — норма. Число платежей выбирается _до_ создания платежа,
поэтому ему место в `CreateIntentInput.metadata`, а не в действии.

**dLocal, EBANX и Mercado Pago** агрегируют всё это. Большинство их флоу сводится к
`redirect` + `return_url`, исключения — ваучеры и PIX.

## Банки в США

Прямые интеграции с банками здесь встречаются реже, чем в Европе: рынок эквайринга
сконцентрирован в нескольких процессингах, которые банки перепродают. На практике «шлюз
нашего банка» обычно означает Fiserv (First Data), Global Payments, Worldpay/FIS, Elavon или
Chase Paymentech.

Чего ждать:

- **Hosted payment page** как рекомендуемый путь: создать сессию, редиректнуть, вернуться.
  `redirect` + `surface: 'top'`.
- **Host-to-host с подписью.** Старые API подписывают склейку полей общим секретом. Считайте
  подпись на бэкенде — ей нужен секрет.
- **ACH** для переводов вместо карточных рельсов. Это медленно: `processing` на дни. Привязку
  счёта делает Plaid или похожий агрегатор — ещё один `sdk_handoff`.

## Что стоит знать на практике

**3-D Secure в США не обязателен.** Плагин всё равно обязан уметь `requires_action` — эмитент
может попросить в любой момент, — но не стройте UI из предположения, что челлендж будет
всегда.

**Проверка адреса значит больше, чем в Европе.** AVS и почтовый индекс — частые причины
отказа, поэтому сообщение об отказе стоит показывать дословно; контракт этого и требует.

**Суммы в минорных единицах, USD двухзначный.** Осторожно с валютами LATAM, где это не так: у
чилийского песо нет копеек вообще, и ошибка здесь списывает в сто раз больше.
