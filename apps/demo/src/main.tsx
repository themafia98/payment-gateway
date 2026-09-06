import { createRoot } from 'react-dom/client'
import { applyPlatform } from '@checkout-kit/runtime-browser'
import { App, enableMocking } from '@/app'

const root = document.getElementById('root')!

applyPlatform(root)

enableMocking().then(() => {
  createRoot(root).render(<App />)
})
