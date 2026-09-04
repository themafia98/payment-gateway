import { createRoot } from 'react-dom/client'
import { App, enableMocking } from '@/app'

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(<App />)
})
