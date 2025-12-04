const stickers = [
  { id: 'sticker1', src: '/images/sticker1.gif' },
  { id: 'sticker2', src: '/images/sticker2.gif' },
  { id: 'sticker3', src: '/images/sticker3.gif' }
]

export function createStickerManager({ elements, getState, getAuthState, ensureSocket, setFeedback }) {
  const showFloatingSticker = (src) => {
    const img = document.createElement('img')
    img.src = src
    img.className = 'float-sticker'
    const x = window.innerWidth / 2 + (Math.random() * 120 - 60)
    const y = window.scrollY + window.innerHeight / 2 + (Math.random() * 80 - 40)
    img.style.left = `${x}px`
    img.style.top = `${y}px`
    document.body.appendChild(img)
    img.addEventListener('animationend', () => img.remove())
  }

  const receiveSticker = (payload) => {
    if (!payload?.src) return
    showFloatingSticker(payload.src)
    if (payload.from) {
      setFeedback(`${payload.from} sent a sticker!`, 'info')
    }
  }

  const sendSticker = (src) => {
    const state = getState()
    if (!state.inVersus || !state.opponentUsername) {
      setFeedback('Play versus to send stickers.', 'error')
      return
    }
    ensureSocket()
      .then((ws) => {
        ws.send(JSON.stringify({ type: 'sticker', payload: { to: state.opponentUsername, src } }))
        setFeedback('Sticker sent!', 'info')
      })
      .catch(() => {
        setFeedback('Could not send sticker.', 'error')
      })
  }

  const renderStickers = () => {
    const bar = elements?.stickerBar
    if (!bar) return
    const state = getState()
    const auth = getAuthState()
    const visible = auth.authenticated && state.inVersus
    bar.hidden = !visible
    if (!visible) return
    if (!bar.dataset.rendered) {
      bar.innerHTML = ''
      stickers.forEach((sticker) => {
        const img = document.createElement('img')
        img.src = sticker.src
        img.dataset.sticker = sticker.id
        img.alt = sticker.id
        img.loading = 'lazy'
        bar.appendChild(img)
      })
      bar.dataset.rendered = 'true'
    }
    bar.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src')
      img.onclick = () => sendSticker(src)
    })
  }

  return { renderStickers, receiveSticker }
}
