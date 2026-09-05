import { useState } from 'react'
import { Button, SafeAreaView, StyleSheet, Text } from 'react-native'
import { CheckoutScreen } from './CheckoutScreen'

type Outcome = 'success' | 'failure' | 'cancelled'

const MESSAGES: Record<Outcome, string> = {
  success: 'Payment received. Thank you.',
  failure: 'The payment did not go through.',
  cancelled: 'Payment cancelled.',
}

export default function App() {
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  if (!outcome) return <CheckoutScreen onDone={setOutcome} />

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.message}>{MESSAGES[outcome]}</Text>
      <Button title="Start again" onPress={() => setOutcome(null)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  message: { fontSize: 17 },
})
