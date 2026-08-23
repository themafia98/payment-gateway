export async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return
  }

  const { worker } = await import('@/mocks/browser')

  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  })
}
