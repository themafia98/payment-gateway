import { createWebViewBridge, type WebViewBridge } from '@checkout-kit/webview-bridge'
import { checkout } from './checkout'

// In a browser this is a no-op object, so the same build serves both.
export const webview: WebViewBridge = createWebViewBridge(checkout, { reportHeight: true })
