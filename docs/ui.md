# The UI kit

> Русская версия: [ui.ru.md](./ui.ru.md)

`@checkout-kit/ui` is the visible half of the checkout: the fields a shopper types a card
into, the screens a payment moves through, and the tokens that make it look like your
product rather than like a library.

It is plain CSS and plain React. No framework, no CSS-in-JS, no icon package, no runtime
dependencies at all.

```tsx
import '@checkout-kit/ui/styles.css'
```

Then put `ck-root` on a wrapper, or use `CheckoutRoot`, which also carries the theme and the
platform:

```tsx
import { CheckoutRoot } from '@checkout-kit/react'

;<CheckoutRoot theme="auto">…</CheckoutRoot>
```

Everything is scoped under that element, and it all sits in a `checkout` cascade layer, so
your own CSS wins without a specificity fight. If you use layers too, say where ours goes:

```css
@layer theme, base, components, checkout, utilities;
```

With Tailwind that means importing its parts, so the kit lands after preflight - which would
otherwise reset the buttons it draws - and before utilities:

```css
@layer theme, base, components, checkout, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@checkout-kit/ui/styles.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

## Theming

Three tiers of custom property. You normally touch one of them.

**Rebrand everything** by moving the accent. The hover, pressed, subtle and focus tones are
derived from it, so they move together and stay in step:

```css
.ck-root {
  --ck-p-accent-500: #0a7;
}
```

**Change one thing** by setting the semantic token for it:

```css
.ck-root {
  --ck-radius: 8px;
  --ck-control-height: 3rem;
  --ck-font: 'Inter', system-ui, sans-serif;
}
```

The semantic tier is what the rules read: `--ck-accent`, `--ck-surface{,-raised,-sunken}`,
`--ck-border{,-strong}`, `--ck-text{,-muted,-subtle}`, `--ck-danger`, `--ck-success`, plus
scales for space (`--ck-space-1…12`), type (`--ck-font-size-xs…2xl`), radius, control
heights, focus ring and motion. The primitive tier underneath (`--ck-p-*`) is the raw ramps.

**Light and dark.** Dark is the default. Set `data-ck-theme="light"` for light, or
`data-ck-theme="auto"` to follow the system. Only the semantic tier is redefined, so a light
theme is the same brand rather than a second one.

```html
<div class="ck-root" data-ck-theme="auto">…</div>
```

**Motion, contrast and touch** are handled through the same tokens: one
`prefers-reduced-motion` block sets every duration to nothing, because no rule hard-codes
one; `prefers-contrast: more` strengthens borders and the focus ring; `pointer: coarse`
raises the minimum tap target to 48px.

**Platform conventions.** An iPhone and an Android disagree about the font, the corner
radius and what a press looks like, and CSS cannot see which one it is on. `CheckoutRoot`
detects it; without React, call `applyPlatform(root)` from `@checkout-kit/runtime-browser`
once at startup. Pin it with `platform="ios"` to check a layout, or leave the attribute off
entirely and everything falls back to the desktop values.

Everything else - touch, hover, colour scheme, contrast, motion - stays a media query,
because those the browser does know.

**Layout is measured against the container, not the window.** `.ck-root` is a container, and
every layout decision is a container query. The same checkout renders full-page, in a 360px
WebView and inside a merchant iframe of unknown width - a viewport query is wrong in two of
those three.

## The components

**Form.** `Field` is the one to know. It gives a control an id, points the label at it, and
names the hint and the error in `aria-describedby`. Every input in the kit goes through it,
which is why no screen has to remember to do it.

```tsx
<Field label="Email" hint="Where the receipt goes" error={errors.email?.message} required>
  {(control) => <Input {...control} type="email" autoComplete="email" />}
</Field>
```

`FieldGroup` is a `<fieldset>` for fields that ask one question together, like a billing
address, and `FieldRow` pairs two short ones side by side once there is room for both.

**Card entry.** `CardNumberInput`, `ExpiryInput`, `CvcInput`, `CardholderInput`, laid out by
`CardFields`. They format as you type without throwing the caret to the end, group the
digits the way the brand prints them - 4-6-5 the moment an Amex prefix appears - and take
their lengths from the same rules the validator uses, so a mask and a message can never
disagree. The brand shows as a text badge; scheme logos are trademarks, so pass your own
through `icons` if you have the licence.

**Choice.** `OptionCardGroup` and `OptionCard` are real radio buttons, hidden and styled
through `:has(:checked)`. Arrow keys, form semantics and the screen-reader announcement come
from the browser. `PaymentMethodSelector` is the same thing with payment metadata, and the
methods come from you - the kit has no list of its own.

```tsx
<PaymentMethodSelector
  methods={[
    { id: 'card', label: 'Card', description: 'Visa, Mastercard, Amex' },
    { id: 'transfer', label: 'Bank transfer', badge: 'Instant' },
  ]}
  value={method}
  onChange={setMethod}
/>
```

**Payment.** `PaymentStatus` is the single live region on the page: what happens to the money
is what gets announced, and field errors stay polite so they do not drown it out.
`PaymentButton` shows a spinner and stops responding while a payment runs, but keeps its
label and its focus - a label that changes mid-payment moves the target under the cursor,
and a disabled button drops focus to the top of the page.

`ProcessingState`, `AuthenticationState`, `SuccessState` and `FailureState` are the screens a
payment ends on. Each leads with a heading and takes focus on arrival, so a screen reader
starts at the answer. Cancellation is a tone of `FailureState`, not a fifth screen.

`CheckoutLayout` is the column, with an optional `aside` for an order summary: above the
form on a phone, sticky beside it from 48rem. `ck-panel` is an opt-in raised surface for
whatever goes in it.

`ActionFrame` is where a provider draws. Three variants, because a hosted field frame, a bank
page and a QR code want three different sizes:

```tsx
<ActionFrame variant="challenge">
  <PaymentActionHost className="ck-action-host" />
</ActionFrame>
```

## Accessibility, and where the line is

The kit gives you: a label and an error tied to every field, one alert and one status region
rather than a scatter of them, a visible focus ring on every control, a real tab pattern with
arrow keys, radio groups the keyboard can reach, tap targets no smaller than 44px, and state
screens that take focus.

You still own: where focus goes when your routes change, and any announcement that belongs to
your layout rather than to the payment. The kit does not own your page, so it cannot do those
for you.

## Translation

Every string the kit renders can be replaced. There is no i18n library in here, and no
opinion about which one you use.

```tsx
<PaymentStatus state={state} messages={{ processing: t('checkout.processing') }} />
<PaymentButton state={state}>{t('checkout.pay')}</PaymentButton>
<SuccessState heading={t('checkout.paid')} />
```

The runners in `@checkout-kit/runtime-browser` take their strings the same way - see
`createBrowserRuntime({ redirect: { frameTitle }, display: { text } })`.

What you should not translate is `PaymentError.message`: those are the issuer words, and
they are what the shopper repeats to their bank. Branch on `PaymentError.code` if you need
your own wording, and fall back to the message for codes you do not know.
