# Чекаут в нативном приложении

> English version: [webview.md](./webview.md)

Тот же веб-чекаут, открытый в WebView, с нативным приложением вокруг.
`@checkout-kit/webview-bridge` — контракт между ними.

Почему WebView: платёжная страница меняется, когда меняется провайдер, и её проверяют по
PCI. Один чекаут на браузер и на приложение — это одно место для правок и один предмет для
проверки. То, что покупатель ждёт нативным (шапка, кнопка отмены, экран результата),
остаётся нативным, потому что оно с провайдером не разговаривает.

Исключение — кошелёк. Apple Pay и Google Pay обязан показывать сам ОС, поэтому их берите
нативно, а остальное отдайте WebView.

## Три точки входа

| Импорт                                  | Где работает | Что внутри                            |
| --------------------------------------- | ------------ | ------------------------------------- |
| `@checkout-kit/webview-bridge`          | веб-чекаут   | подписка на движок, отправка событий  |
| `@checkout-kit/webview-bridge/host`     | React Native | парсер сообщений и политика навигации |
| `@checkout-kit/webview-bridge/protocol` | обе стороны  | типы сообщений                        |

В последних двух нет DOM, и это проверяет CI: `npm run purity` падает, если там появится
`window`. Именно поэтому они собираются в бандл React Native.

## Веб-сторона

Одна строка в композиционном корне. Вне WebView возвращается пустышка, поэтому та же сборка
работает в браузере:

```ts
import { createWebViewBridge } from '@checkout-kit/webview-bridge'

export const bridge = createWebViewBridge(checkout, { reportHeight: true })
```

Мост подписывается только на публичные события движка, поэтому `@checkout-kit/core` о его
существовании не знает.

## Нативная сторона

```tsx
import {
  createCheckoutMessageHandler,
  createNavigationPolicy,
  parseReturnDeepLink,
} from '@checkout-kit/webview-bridge/host'

const handle = createCheckoutMessageHandler({
  PAYMENT_STATE_CHANGED: (event) => setHeading(event.payload.state),
  PAYMENT_SUCCEEDED: () => navigate('Receipt'),
  PAYMENT_DECLINED: (event) => Alert.alert('Отказ', event.payload.message),
})

const policy = createNavigationPolicy({
  allow: ['https://pay.example.com/checkout'],
  openExternally: ['https://help.example.com'],
  returnScheme: 'myapp',
})

<WebView
  source={{ uri: 'https://pay.example.com/checkout' }}
  onMessage={(event) => handle(event.nativeEvent.data)}
  onShouldStartLoadWithRequest={(request) => policy.decide(request.url) !== 'block'}
/>
```

Целый экран лежит в [`examples/react-native-checkout`](../examples/react-native-checkout).

## Сообщения

В каждом сообщении есть `source: 'checkout-kit'`, версия, id и id сессии: в WebView прилетает
трафик от всего, что есть на странице, а перезагруженный WebView оставляет после себя
устаревшие сообщения. Версию, которую хост не понимает, он отвергает как
`unsupported_version`, а не читает наполовину.

| Событие                                                                           | Когда                                                     |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `PAYMENT_READY`                                                                   | первым, всегда: версия моста, провайдер, что он принимает |
| `PAYMENT_STATE_CHANGED`                                                           | одно из девяти состояний UI                               |
| `PAYMENT_INTENT_CREATED`                                                          | сумма и валюта подтверждены                               |
| `PAYMENT_REQUIRES_ACTION`                                                         | несёт URL редиректа, чтобы хост мог открыть его снаружи   |
| `PAYMENT_ACTION_STARTED` / `PAYMENT_ACTION_FINISHED`                              | вокруг шага аутентификации                                |
| `PAYMENT_SUCCEEDED` / `PAYMENT_DECLINED` / `PAYMENT_CANCELLED` / `PAYMENT_FAILED` | исход                                                     |
| `PAYMENT_HEIGHT_CHANGED`                                                          | высота документа, если включён `reportHeight`             |

Команды в обратную сторону: `PAYMENT_CANCEL`, `PAYMENT_RETRY`, `PAYMENT_RESUME`,
`PAYMENT_SET_THEME`, `PAYMENT_PING`.

## Возврат из банка

**Предпочтительно: не выходить из WebView.** Редирект происходит внутри, URL возврата
приходит в `onShouldStartLoadWithRequest`, политика помечает его `return`, а приложение не
делает ничего — веб-чекаут поднимает себя сам, ровно как после редиректа в браузере. Банк
сохраняет свои куки, и это важно: ACS, поставивший куку привязки устройства в WebView, из
другого места её не увидит.

**Запасной путь: диплинк.** Для банка, который запрещает фрейминг, откройте URL в
`ASWebAuthenticationSession` или Custom Tab, поймайте возврат и отправьте его обратно:

```ts
Linking.addEventListener('url', ({ url }) => {
  const params = parseReturnDeepLink(url, { scheme: 'myapp', path: 'payment/return' })
  if (params) send('PAYMENT_RESUME', { params })
})
```

Чекаут записал id провайдера, интента и действия в session storage до запуска действия,
поэтому `hydrate(params)` подхватывает платёж без единого нового метода движка.

## Безопасность

**Задайте политику навигации.** Без неё любая ссылка со страницы откроется внутри вашего
приложения. `createNavigationPolicy` сравнивает origin на равенство и потом матчит префикс
пути — никаких подстрок, потому что `https://evil.test/#https://pay.example.com` проходит
любую проверку, смотрящую на URL как на текст. `http:` блокируется всегда.

**Через мост не проходят данные карты.** Payload собирается по белому списку поле за полем, и
есть тест, который прогоняет настоящий карточный платёж и проверяет, что ни номера, ни кода,
ни имени держателя нет ни в одном сообщении.

**Проверяйте источник.** Хостовый парсер отбрасывает всё без `source: 'checkout-kit'`, а
веб-сторона так же игнорирует команды.

**Отдавайте чекаут по https с origin, которым владеете вы**, и в `allow` кладите только его.
WebView, смотрящий на URL, который может поменять сервер, — это WebView, который может
навести кто-то другой.
