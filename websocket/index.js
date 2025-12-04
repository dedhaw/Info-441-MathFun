import { WebSocketServer } from 'ws'

const buildFallbackProblem = () => {
  const a = Math.floor(Math.random() * 20) + 1
  const b = Math.floor(Math.random() * 20) + 1
  return { problem: `${a} + ${b}`, answer: a + b, generated: true }
}

export function setupWebsocket(server, models) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  const sendProblem = async (ws) => {
    try {
      const sample = await models.MathProblem.aggregate([{ $sample: { size: 1 } }])
      const problem = sample[0] || null
      if (problem) {
        ws.send(JSON.stringify({ type: 'problem', payload: { problem: problem.problem, answer: problem.answer, generated: false } }))
      } else {
        ws.send(JSON.stringify({ type: 'problem', payload: buildFallbackProblem() }))
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'problem', payload: buildFallbackProblem() }))
    }
  }

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams
    ws.username = params.get('username') || 'guest'
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'problem_request') {
          sendProblem(ws)
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'invalid message' } }))
      }
    })
  })

  return wss
}
