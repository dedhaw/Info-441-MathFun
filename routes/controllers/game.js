import express from 'express';
import expressWs from 'express-ws';
import { models, set } from 'mongoose';

var router = express.Router();
expressWs(router);

const TIME_LIMIT = 60000; // 60 seconds

async function getMathProblem() {
  let problems =  await models.Problem.aggregate([{ $sample: { size: 1 } }])

  // debug?
  console.log(problems)
  return problems[0]
}
router.ws('/play', (ws, req) => {

    // handle message to start game
    ws.on('message', (msg) => {
      const data = JSON.parse(msg);

      console.log(`Received message from player: ${msg}`);
      if (data.action === 'startGame') {
        console.log('starting game')
        ws.score = 0
        ws.endTime = Date.now() + TIME_LIMIT

        ws.timeOut = setTimeout(() => {
          ws.send(JSON.stringify({
            action: 'gameOver',
            score: ws.score
          }))
          ws.close()
        }, TIME_LIMIT)

        const problem = getMathProblem()
        ws.send(JSON.stringify({
          action: 'newProblem',
          problem: { id: problem._id, question: problem.question }
        }))
      } else if (data.action === 'submitAnswer') {
        console.log('answer submitted')
        const currentTime = Date.now()
        if (currentTime > ws.endTime) {
          ws.send(JSON.stringify({
            action: 'gameOver',
            score: ws.score
          }))
          return
        }
      }
    })

    ws.on('close', () => {
        console.log('Player disconnected from /game/play');
    });
});

export default router;