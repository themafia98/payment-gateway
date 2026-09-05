export interface Invoice {
  subtotal: number
  discount?: string
  total: number
  currency: string
}
