import express from 'express'

const router = express.Router()

router.get('/problem', async (req, res) => {
  try {
    const sample = await req.models.MathProblem.aggregate([{ $sample: { size: 1 } }])
    const problem = sample[0]
    if (!problem) {
      const a = Math.floor(Math.random() * 20) + 1
      const b = Math.floor(Math.random() * 20) + 1
      return res.json({ problem: `${a} + ${b}`, answer: a + b, generated: true })
    }
    res.json({ problem: problem.problem, answer: problem.answer, generated: false })
  } catch (err) {
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 20) + 1
    res.json({ problem: `${a} + ${b}`, answer: a + b, generated: true })
  }
})

router.get('/highscore', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: 'username query param is required' });
    }

    const { User, Scores } = req.models;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let highScoreDoc = null;
    if (user.high_score) {
      highScoreDoc = await Scores.findById(user.high_score);
    }

    if (!highScoreDoc) {
      const top = await Scores.find({ username }).sort({ score: -1 }).limit(1);
      if (top.length) {
        highScoreDoc = top[0];
      }
    }

    if (!highScoreDoc) {
      return res.json({ username, highScore: null });
    }

    return res.json({
      username,
      highScore: highScoreDoc.score,
      date: highScoreDoc.date,
    });
  } catch (error) {
    console.error('Error fetching high score:', error);
    return res.status(500).json({ message: 'Failed to fetch high score' });
  }
})

router.post('/score', async (req, res) => {
    try {
        const { username, score } = req.body;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ message: 'username is required' });
        }

        const parsedScore = Number(score);
        if (Number.isNaN(parsedScore) || parsedScore < 0) {
            return res.status(400).json({ message: 'score must be a positive number' });
        }

        const { User, Scores } = req.models;

        let user = await User.findOne({ username });
        if (!user) {
            user = await User.create({
                username,
                friends: [],
                friend_requests: [],
                last_online: new Date(),
            });
        }

        const scoreDoc = await Scores.create({
            username,
            score: parsedScore,
            date: new Date(),
        });

        let previousHighScore = -1;
        if (user.high_score) {
            const existingHigh = await Scores.findById(user.high_score);
            if (existingHigh) {
                previousHighScore = existingHigh.score;
            }
        }

        user.lifetime.total_games = (user.lifetime.total_games || 0) + 1;
        user.lifetime.total_score = (user.lifetime.total_score || 0) + parsedScore;

        let highScoreUpdated = false;
        if (parsedScore > previousHighScore) {
            user.high_score = scoreDoc._id;
            highScoreUpdated = true;
        }

        await user.save();

        return res.status(201).json({
            message: 'Score recorded',
            scoreId: scoreDoc._id,
            highScoreUpdated,
            highScore: highScoreUpdated ? parsedScore : previousHighScore,
            lifetime: user.lifetime,
        });
    } catch (error) {
        console.error('Error saving score:', error);
        return res.status(500).json({ message: 'Failed to save score' });
  try {
    const { username, score } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'username is required' });
    }

    const parsedScore = Number(score);
    if (Number.isNaN(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ message: 'score must be a positive number' });
    }

router.get('/leaderboard', async (req, res) => {
    try {
        const users = await req.models.User.find({})
            .populate('high_score')
            .lean();

        const leaderboard = users
            .map(u => ({
                username: u.username,
                high_score: u.high_score?.score ?? 0,
            }))
            .sort((a, b) => b.high_score - a.high_score)
            .slice(0, 20)
            .map((u, idx) => ({ ...u, rank: idx + 1 }));

        res.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
});


export default router;
    const { User, Scores } = req.models;

    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        friends: [],
        friend_requests: [],
        last_online: new Date(),
      });
    }

    const scoreDoc = await Scores.create({
      username,
      user: user._id,
      score: parsedScore,
      date: new Date(),
    });

    let previousHighScore = -1;
    if (user.high_score) {
      const existingHigh = await Scores.findById(user.high_score);
      if (existingHigh) {
        previousHighScore = existingHigh.score;
      }
    }

    let highScoreUpdated = false;
    if (parsedScore > previousHighScore) {
      user.high_score = scoreDoc._id;
      await user.save();
      highScoreUpdated = true;
    }

    return res.status(201).json({
      message: 'Score recorded',
      scoreId: scoreDoc._id,
      highScoreUpdated,
      highScore: highScoreUpdated ? parsedScore : previousHighScore,
    });
  } catch (error) {
    console.error('Error saving score:', error);
    return res.status(500).json({ message: 'Failed to save score' });
  }
})

export default router
