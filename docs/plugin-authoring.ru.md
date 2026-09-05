# Как написать платёжный плагин

> English version: [plugin-authoring.md](./plugin-authoring.md)

Плагин — единственное место, которое знает, как разговаривает конкретный платёжный
провайдер. Всё остальное — движок, форма, экран аутентификации, страницы результата —
написано один раз и переиспользуется всеми интеграциями.

Контракт — это четыре метода. Основная работа — решить, как выразить то, что имеет в виду
ваш провайдер.

## Форма плагина

```ts
import type { PaymentProvider, ProviderContext, PaymentProviderInstance } from '@pg/core'
import { createHttpClient } from '@pg/core/http'

export interface AcmeConfig {
  readonly baseUrl: string
  readonly apiKey: string
}

// Объявляем конфиг системе типов хоста, чтобы `defineProvider({ id: 'acme', ... })`
// проверялся, хотя код плагина хост не импортирует.
declare module '@pg/core' {
  interface ProviderConfigRegistry {
    acme: AcmeConfig
  }
}

export const acmeProvider: PaymentProvider<AcmeConfig> = {
  id: 'acme',
  displayName: 'Acme Payments',
  capabilities: {
    instruments: ['card'],
    actions: ['redirect'],
    surfaces: ['iframe', 'top'],
    authentication: ['none', '3ds2'],
    session: 'lazy',
    cancel: true,
    poll: false,
    idempotency: 'header',
  },
  create: (ctx: ProviderContext<AcmeConfig>): PaymentProviderInstance => {
    const http = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch })
    return {
      createIntent: async (input, opts) => {
        /* ... */
      },
      confirm: async (intentId, instrument, opts) => {
        /* ... */
      },
      resume: async (intentId, evidence, opts) => {
        /* ... */
      },
      getIntent: async (intentId, opts) => {
        /* ... */
      },
      cancel: async (intentId, opts) => {
        /* ... */
      },
    }
  },
}

export default acmeProvider
```

Экспортируйте провайдер ещё и дефолтом: хост регистрирует его как
`load: () => import('@pg/provider-acme')`, и реестр разворачивает дефолтный экспорт.

## Четыре глагола

**`createIntent`** начинает платёж и возвращает то, что домен называет `PaymentIntent`.
Если вашему API нужно два round-trip'а, чтобы его получить — зарегистрировать заказ, потом
прочитать его обратно, — делайте оба здесь. Движку всё равно, во сколько запросов обходится
глагол.

**`confirm`** предъявляет инструмент. Либо сразу завершает платёж, либо отвечает
`requires_action` с тем, что должно произойти дальше.

**`resume`** продолжает, когда действие завершилось, и получает сырое evidence от раннера.
**Здесь живёт смысл вашего протокола.** `transStatus` со значением `Y`, `orderStatus` 6, блоб
`PaRes`, токен кошелька — всё это читается тут и больше нигде. Поэтому банк с 3-D Secure 1 и
процессинг с 3-D Secure 2 приводят к одному и тому же экрану.

**`getIntent`** перечитывает платёж. Движок зовёт его всякий раз, когда одного evidence
недостаточно, — то есть почти всегда.

`cancel` необязателен; объявляйте `capabilities.cancel`, только если реализовали его.

## Действия: как попросить следующий шаг

Верните `requires_action` с `PaymentAction`, и движок найдёт для него раннер. Четырёх видов
хватает на все интеграции в этом репозитории:

| Вид              | Когда использовать                               | Какое evidence вернётся         |
| ---------------- | ------------------------------------------------ | ------------------------------- |
| `redirect`       | покупателю нужно уйти — во фрейм или во всё окно | `post_message` или `return_url` |
| `collect_fields` | ваши поля рендерятся внутри чекаута              | `post_message`                  |
| `sdk_handoff`    | платёж ведёт ваш скрипт                          | `sdk_callback`                  |
| `poll`           | показывать нечего, ответ придёт позже            | `poll`                          |

Два поля делают больше, чем кажется:

- **`surface`** — предпочтение, а не требование. Хост может выполнить то же действие во
  фрейме или во всём окне, и раннер вернёт подходящее evidence.
- **`returnUrlField`** называет поле для абсолютного URL возврата (`TermUrl`, `returnUrl` —
  как принято у вашего API). Не собирайте этот URL сами: базу знает только хост, и собранный
  вручную URL ломается на деплое из подпути.

Ставьте `completion.correlationField`, если провайдер возвращает идентификатор транзакции
под своим именем (`challengeId`, `MD`). Это то, что не даёт устаревшему сообщению от
прошлой попытки завершить текущий платёж.

## Правила, которые типами не выразить

**`confirm` и `resume` никогда не бросают.** Сбой сети, кривой ответ, неизвестный статус —
всё возвращается как `{ status: 'error' }`. Эти два метода сообщают, что случилось с
деньгами, и брошенное исключение лишает вызывающего возможности это сказать.
`createIntent`, `getIntent` и `cancel` могут реджектить — движок сам превратит это в
результат-ошибку.

**Evidence — подсказка, а не истина.** То, что пришло из редиректа или `postMessage`,
говорит, где побывал браузер. Ушли ли деньги, знает только ваш API — спросите его. Плагин
hosted page игнорирует `status=success` в URL возврата и перечитывает заказ. Есть e2e-тест,
который возвращается с сообщением «успех», ничего не заплатив, и попадает на страницу отказа.

**Возвращайте сообщение эмитента, а не своё.** Покупатель может зачитать вашу строку
оператору банка. `«Your card was declined.»` — это слова эмитента;
`«Unexpected status declined»` — баг, который однажды уехал в прод.

**Отклонённая карта — не ошибка.** Одни API сообщают отказ успешным вызовом со статусом,
другие — HTTP-ошибкой. И то и другое маппится в `declined`. `error` — только когда сломались
вы или сеть и никто не знает, что стало с платежом.

**Capabilities — для валидации и текстов.** Хост по ним проверяет наличие нужных раннеров и
решает, показывать ли форму карты. Не давайте чекауту решать по ним, что требуется платежу:
это решает эмитент в момент транзакции, и единственный надёжный сигнал — действие, которое вы
вернули.

**Не возвращайте данные инструмента.** Ничто из возвращаемого не должно содержать номер
карты — в том числе в поле `detail` «для логов».

## Докажите

Каждый плагин проходит один и тот же набор:

```ts
import { describeProviderContract } from '@pg/conformance'
import { acmeHandlers } from './test-backend'
import { SCENARIO_CARDS, declineMessage } from '@pg/testing'
import { acmeProvider } from './provider'

describeProviderContract({
  provider: acmeProvider,
  config: { baseUrl: 'http://acme.test', apiKey: 'test' },
  handlers: acmeHandlers,
  declineMessage: declineMessage(),
  instrumentFor: (testCase) => card(SCENARIO_CARDS[testCase]),
  evidenceFor: (action, outcome) => ({
    via: 'post_message',
    actionId: action.id,
    origin: 'https://acs.test',
    data: { transStatus: outcome === 'pass' ? 'Y' : 'N' },
  }),
})
```

Пятнадцать тестов. Они проверяют правила выше, а не вашу реализацию: отказ несёт сообщение
эмитента; evidence для действия, которого вы не выдавали, ничего не подтверждает; повторный
`resume` отвечает одинаково дважды, а не бросает; авария превращается в результат, а не в
исключение; за объявленной capability есть метод; номер карты не возвращается наружу.

Если тест падает, а утверждение кажется неверным для вашего провайдера — скажите. Набор
описывает то, на что вправе рассчитывать движок и UI, и интеграция, которая этого не даёт, —
та, которой они не смогут безопасно пользоваться.

## Регистрация

```ts
import { defineProvider } from '@pg/core'
import type { AcmeConfig } from '@pg/provider-acme'

defineProvider({
  id: 'acme',
  config: { baseUrl: '/api/acme', apiKey } satisfies AcmeConfig,
  load: () => import('@pg/provider-acme'),
})
```

Импорт типа стирается при сборке. Динамический импорт кладёт код плагина в отдельный чанк,
который никто не скачает, пока провайдера не выберут. Регистрация заодно проверяет, что у
хоста есть раннеры под все действия, которые вы можете вернуть: отсутствие раннера станет
ошибкой на старте, а не сюрпризом посреди платежа.
