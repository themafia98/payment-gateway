export interface Invoice {
  subtotal: number
  discount?: number
  total: number
  currency: string
}
