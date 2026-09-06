import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Linking, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import {
  createCheckoutMessageHandler,
  createNavigationPolicy,
  parseReturnDeepLink,
} from '@checkout-kit/webview-bridge/host'
import type { PaymentUiState } from '@checkout-kit/core'

// The checkout is the web app, opened in a WebView. This screen owns the chrome around it,
// the navigation rules, and what happens when the payment finishes.

const CHECKOUT_URL = 'https://pay.example.com/checkout'
const RETURN_SCHEME = 'myapp'

const HEADINGS: Partial<Record<PaymentUiState, string>> = {
  idle: 'Checkout',
  editing: 'Checkout',
  submitting: 'Sending your payment',
  processing: 'Confirming your payment',
  requires_action: 'Confirm with your bank',
  success: 'Paid',
  failure: 'Payment failed',
  cancelled: 'Payment cancelled',
}

interface CheckoutScreenProps {
  onDone: (outcome: 'success' | 'failure' | 'cancelled') => void
}

export const CheckoutScreen = ({ onDone }: CheckoutScreenProps) => {
  const webview = useRef<WebView>(null)
  const [state, setState] = useState<PaymentUiState>('idle')

  const policy = useMemo(
    () =>
      createNavigationPolicy({
        // Only the checkout runs in here. Everything else is either opened outside or
        // refused: a WebView with no policy will follow any link the page offers.
        allow: [CHECKOUT_URL],
        openExternally: ['https://help.example.com'],
        returnScheme: RETURN_SCHEME,
      }),
    [],
  )

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    webview.current?.postMessage(
      JSON.stringify({
        source: 'checkout-kit',
        v: 1,
        id: `native:${Date.now()}`,
        sessionId: 'native',
        ts: Date.now(),
        type,
        payload,
      }),
    )
  }, [])

  const handleMessage = useMemo(
    () =>
      createCheckoutMessageHandler({
        PAYMENT_STATE_CHANGED: (event) => setState(event.payload.state),
        PAYMENT_SUCCEEDED: () => onDone('success'),
        PAYMENT_DECLINED: (event) => {
          Alert.alert('Payment declined', event.payload.message)
          onDone('failure')
        },
        PAYMENT_FAILED: () => onDone('failure'),
        PAYMENT_CANCELLED: () => onDone('cancelled'),
      }),
    [onDone],
  )

  // The fallback path: a bank that refuses to be framed sends the shopper out to a browser,
  // and the app comes back through its own deep link.
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const params = parseReturnDeepLink(url, { scheme: RETURN_SCHEME, path: 'payment/return' })
      if (params) send('PAYMENT_RESUME', { params })
    })

    return () => subscription.remove()
  }, [send])

  const decide = (request: WebViewNavigation): boolean => {
    const decision = policy.decide(request.url)

    if (decision === 'external') void Linking.openURL(request.url)
    // A return link inside the WebView needs nothing from us: the web app hydrates itself.
    return decision === 'allow' || decision === 'return'
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>{HEADINGS[state] ?? 'Checkout'}</Text>
        <Button title="Cancel" onPress={() => send('PAYMENT_CANCEL')} />
      </View>

      <WebView
        ref={webview}
        source={{ uri: CHECKOUT_URL }}
        onMessage={(event) => handleMessage(event.nativeEvent.data)}
        onShouldStartLoadWithRequest={decide}
        // The checkout has fields; the keyboard must not cover them.
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        style={styles.webview}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06040a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { color: '#ebe9ef', fontSize: 17, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: 'transparent' },
})
