import express from 'express';

const router = express.Router();

router.get('/problem', async (req, res) => {
    try {
        const problems = await req.models.MathProblem.aggregate([{ $sample: { size: 1 } }]);
        if (!problems.length) {
            return res.status(404).json({ message: 'No math problems available' });
        }

        const [problem] = problems;
        return res.json({
            id: problem._id,
            problem: problem.problem,
            answer: problem.answer,
        });
    } catch (error) {
        console.error('Error fetching math problem:', error);
        return res.status(500).json({ message: 'Failed to fetch problem' });
    }
});

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
    }
});

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

        if (!user.high_score) {
            return res.json({ username, highScore: null });
        }

        const highScoreDoc = await Scores.findById(user.high_score);
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
});

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

