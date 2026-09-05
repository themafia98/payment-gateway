/**
 * A wallet SDK, standing in for one served by a wallet provider.
 *
 * Loaded by URL at runtime, exactly as a real one is: the checkout has no build-time
 * dependency on it, cannot see inside it, and cannot draw its sheet. What it gets back is
 * a token standing for a card the wallet already holds.
 *
 * The dialog offers a choice of stored card, which is both realistic and how the demo
 * reaches an approval or a decline without a card field anywhere in the checkout.
 */
;(function initDemoWallet() {
  const CARDS = [
    { label: 'Visa •••• 4242', pan: '4242424242424242' },
    { label: 'Visa •••• 0002 (declines)', pan: '4000000000000002' },
  ]

  const styles = `
    .pgw { border: 0; border-radius: 16px; padding: 0; background: #14161d; color: #e9e9e9;
      font: 16px/1.5 system-ui, sans-serif; width: min(320px, 92vw); }
    .pgw::backdrop { background: rgba(0,0,0,.6); }
    .pgw-body { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .pgw h2 { margin: 0; font-size: 17px; }
    .pgw p { margin: 0; color: #9aa0ac; font-size: 13px; }
    .pgw button { padding: 12px; font-size: 15px; border: 0; border-radius: 10px; cursor: pointer; }
    .pgw .pay { background: #fff; color: #111; font-weight: 600; }
    .pgw .card { background: #1f2230; color: #e9e9e9; text-align: left; }
    .pgw .card[aria-pressed='true'] { outline: 2px solid #aa3bff; }
    .pgw .cancel { background: transparent; color: #9aa0ac; text-decoration: underline; }
  `

  function show(params) {
    return new Promise(function (resolve, reject) {
      let selected = CARDS[0]

      const dialog = document.createElement('dialog')
      dialog.className = 'pgw'
      dialog.innerHTML =
        '<style>' +
        styles +
        '</style><div class="pgw-body">' +
        '<h2>Demo&nbsp;Wallet</h2>' +
        '<p>Pay ' +
        (params.merchantName || 'the merchant') +
        ' — ' +
        (params.amount / 100).toFixed(2) +
        ' ' +
        String(params.currency || '').toUpperCase() +
        '</p>' +
        CARDS.map(function (card, index) {
          return (
            '<button type="button" class="card" data-index="' +
            index +
            '" aria-pressed="' +
            (index === 0) +
            '">' +
            card.label +
            '</button>'
          )
        }).join('') +
        '<button type="button" class="pay">Confirm payment</button>' +
        '<button type="button" class="cancel">Cancel</button>' +
        '</div>'

      dialog.querySelectorAll('.card').forEach(function (button) {
        button.addEventListener('click', function () {
          selected = CARDS[Number(button.dataset.index)]
          dialog.querySelectorAll('.card').forEach(function (other) {
            other.setAttribute('aria-pressed', String(other === button))
          })
        })
      })

      function close() {
        dialog.close()
        dialog.remove()
      }

      dialog.querySelector('.pay').addEventListener('click', function () {
        close()
        // A real token is an encrypted blob only the network can open. This one carries
        // the card it stands for, because the mock backend has to resolve it somehow.
        resolve({ walletToken: 'wlt_' + selected.pan })
      })

      dialog.querySelector('.cancel').addEventListener('click', function () {
        close()
        reject(new Error('The shopper closed the wallet.'))
      })

      document.body.append(dialog)
      dialog.showModal()
    })
  }

  window.DemoWallet = { show: show }
})()
