import { create } from 'zustand/react'

interface CheckoutStore {
  step: string
}

export const checkoutStore = create<CheckoutStore>()
