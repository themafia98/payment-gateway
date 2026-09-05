# Европа: провайдеры и банки

> English version: [europe.md](./europe.md)

Сначала прочитайте [Настоящие провайдеры на нашем контракте](../real-world-providers.ru.md):
там разобраны четыре вида действий и правило, что у плагина не бывает секретного ключа.

Имена полей меняются. Перед выкатыванием сверяйтесь с актуальной документацией провайдера;
не меняется только та форма, которую должен вернуть плагин.

## Как устроена Европа

Карты здесь не везде по умолчанию. В Нидерландах платят через iDEAL, в Польше — через BLIK, в
Германии многие предпочитают прямое дебетование или счёт от Klarna. Почти всё это —
**редиректные** флоу: покупатель уходит в свой банк или в приложение метода и возвращается.

Нам это удобно. Одно действие `redirect` с `surface: 'top'` и
`completion: { via: 'return_url' }` закрывает iDEAL, Bancontact, BLIK, Przelewy24, EPS,
Sofort/Klarna и почти всё остальное. Плагины отличаются только тем, что отправляют при
создании платежа.

## Карта

| Провайдер            | Где используется           | Схема                            | Действие                    |
| -------------------- | -------------------------- | -------------------------------- | --------------------------- |
| Adyen                | везде, крупные продавцы    | объект `action`                  | `redirect` / `sdk_handoff`  |
| Stripe               | везде                      | PaymentIntent + `next_action`    | `redirect` / `sdk_handoff`  |
| Mollie               | NL, BE, DE, FR             | payment + `_links.checkout`      | `redirect`                  |
| Checkout.com         | UK, крупный EU-бизнес      | payment + `_links.redirect`      | `redirect`                  |
| Klarna               | Скандинавия, DE, NL        | сессия + SDK либо hosted page    | `sdk_handoff` / `redirect`  |
| Worldline / Ingenico | FR, BE, банковские шлюзы   | hosted page или host-to-host     | `redirect`                  |
| Nexi / Nets          | IT, Скандинавия            | hosted page                      | `redirect`                  |
| PayU                 | PL, Центральная Европа     | order + `redirectUri`            | `redirect`                  |
| Trustly              | Скандинавия, переводы      | order + редирект                 | `redirect`                  |
| Банковский эквайринг | большинство местных банков | host-to-host, 3-D Secure 1 или 2 | `redirect` (фрейм или окно) |

## Mollie

Самый простой API в этом списке и хороший первый плагин.

Бэкенд создаёт платёж, в ответе приходит URL страницы оплаты:

```json
{
  "id": "tr_WDqYK6vllg",
  "status": "open",
  "_links": { "checkout": { "href": "https://www.mollie.com/checkout/select-method/..." } }
}
```

```ts
confirm: async (intentId, instrument) => {
  if (instrument.kind !== 'none') return unsupported(instrument)

  const payment = await http.get<MolliePaymentDto>(`/mollie/payments/${intentId}`)

  return {
    status: 'requires_action',
    intent: toIntent(payment),
    action: {
      id: payment.id,
      kind: 'redirect',
      purpose: 'authorize',
      surface: 'top',
      url: payment._links.checkout.href,
      method: 'GET',
      completion: { via: 'return_url' },
    },
  }
}
```

`resume` перечитывает платёж. Mollie возвращает покупателя на ваш `redirectUrl` вообще без
результата в query — правило соблюдать легко: верить попросту нечему, кроме API.

| `status` у Mollie   | статус домена |
| ------------------- | ------------- |
| `paid`              | `succeeded`   |
| `open`, `pending`   | `processing`  |
| `failed`, `expired` | `declined`    |
| `canceled`          | `canceled`    |

## Checkout.com

Карточный платёж либо проходит сразу, либо возвращает ссылку на 3-D Secure:

```json
{
  "id": "pay_mbabizu24mvu3mela5njyhpit4",
  "status": "Pending",
  "_links": { "redirect": { "href": "https://api.checkout.com/3ds/pay_mba..." } }
}
```

Берите `surface: 'top'` и `completion: { via: 'return_url' }`. Покупатель возвращается с
`cko-session-id`, и `resume` обменивает его на платёж:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'return_url') return unsupported(evidence)
  const payment = await http.get(`/checkout/payments/${evidence.params['cko-session-id']}`, opts)
  return toResult(payment)
}
```

Статусы: `Authorized` и `Captured` → `succeeded`, `Declined` → `declined`, `Pending` →
`processing`, `Canceled`/`Expired` → `canceled`.

## Klarna

Две формы, и какая у вас — зависит от выбранной интеграции:

- **Klarna Payments с SDK** — сессия создаётся на сервере, дальше JavaScript Klarna рисует
  метод и авторизует его. Это `sdk_handoff` с `sdk: 'klarna'`; адаптер зовёт
  `Klarna.Payments.authorize` и резолвится `authorization_token`. Потом `resume` просит
  бэкенд создать заказ с этим токеном.
- **Klarna Hosted Payment Page** — просто URL для редиректа, обычное действие `redirect`.

Klarna стоит отметить отдельно: деньги двигаются при _создании заказа_, а не при авторизации.
Токен авторизации — это ещё не платёж, поэтому `resume` обязан создать заказ и вернуть то, что
ответит эта операция.

## Worldline, Nexi, Nets и другие «старые» платформы

Это те платформы, которые перепродают банки. Обычно доступны оба варианта:

- **hosted payment page**: сессия на сервере, редирект покупателя, возврат и чтение статуса.
  `redirect` + `surface: 'top'`.
- **host-to-host**: карту отправляете вы, в ответ получаете ACS-URL для 3-D Secure. Это та
  форма, которой следует `@pg/provider-acquiring`.

Ждите здесь старых соглашений: form-encoded тела, подпись по склейке полей в фиксированном
порядке (`SHA-256` от строки и общего секрета), числовые коды статусов. Подпись считайте **на
бэкенде** — для неё нужен секрет, а значит в плагине это невозможно.

## Локальные методы — одна схема

iDEAL, Bancontact, BLIK, Przelewy24, EPS, MB WAY — через любой из PSP выше всё сводится к
одному:

```ts
action: {
  id: payment.id,
  kind: 'redirect',
  purpose: 'authorize',
  surface: 'top',
  url: payment.redirectUrl,
  method: 'GET',
  completion: { via: 'return_url' },
}
```

Два из них с нюансом:

- **BLIK** в Польше умеет ещё и шестизначный код, который покупатель вводит на вашей
  странице. Дальше он подтверждает в банковском приложении, а вы ждёте. Действия «собрать
  короткий код и опрашивать» в контракте сегодня нет — см. заметку о пробеле в
  [гайде по Азии](./asia.ru.md#пробел-qr-коды-и-диплинки).
- **SEPA direct debit** — это вообще не редирект: покупатель подписывает мандат, а деньги
  приходят через несколько дней. Моделируйте как `processing` и дайте движку опрашивать, либо
  выносите шаг с мандатом в отдельное действие.

## Банки в Европе

Если интегрируете банк напрямую, а не через PSP, ждите одну из трёх форм.

**1. Банк перепродаёт платформу.** По факту вы интегрируете Worldline, Nexi или похожее. См.
выше.

**2. Host-to-host эквайринг.** Собственное API банка, обычно form-encoded, с кредами в каждом
запросе и числовыми статусами. `@pg/provider-acquiring` написан именно под эту форму:

```text
register.do                 создать заказ
paymentorder.do             отправить карту, получить acsUrl + PaReq + MD, если нужен 3-D Secure
finish3ds.do                отправить PaRes и MD
getOrderStatusExtended.do   прочитать настоящий исход
```

Ловушка всегда одна: отклонённая карта приходит _успешным_ HTTP 200 со статусом. Ненулевой
код ошибки означает, что не удался запрос, а не платёж.

**3. Открытый банкинг (PSD2).** Покупателя редиректит в его собственный банк подтвердить
перевод. С точки зрения плагина это обычный редирект: `redirect` + `surface: 'top'` +
`return_url`, потом читаем статус. Согласие и сам перевод могут завершиться в разное время,
так что ждите `processing`.

## Что стоит знать на практике

**Strong Customer Authentication в ЕС не опция.** Большинство карточных платежей попросят
3-D Secure, поэтому стройте флоу из предположения, что действие будет, а не что оно редкость.

**Валюты и минорные единицы.** Домен считает в минорных единицах, и почти вся Европа —
двухзначная. Всё равно будьте внимательны: часть провайдеров присылает `"10.00"` строкой, а
часть — объект с кодом валюты.

**Возвратов и capture в этом контракте нет.** Они происходят в бэк-офисе, а не в чекауте, и
ни один плагин здесь их не реализует.
