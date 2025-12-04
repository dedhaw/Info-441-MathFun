import express from 'express'

const router = express.Router()

// placeholder to keep structure; versus handled via websocket
router.get('/status', (_req, res) => {
  res.json({ ok: true })
})

export default router
