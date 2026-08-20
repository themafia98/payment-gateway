import { StrictMode } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './providers/router'
import './index.css'

export const App = () => (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
