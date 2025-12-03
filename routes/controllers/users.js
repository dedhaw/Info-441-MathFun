import express from 'express';

const router = express.Router();

router.get('/search', async (req, res) => {
  const { username } = req.query
  if (!username) {
    return res.status(400).json({ error: 'username query required' })
  }
  try {
    const users = await req.models.User.find({ username: { $regex: username, $options: 'i' } }).select('username')
    res.json({ users })
  } catch (err) {
    res.status(500).json({ error: 'failed to search users' })
  }
})

router.get('/:username/friends', async (req, res) => {
  try {
    const user = await req.models.User.findOne({ username: req.params.username }).populate('friends', 'username')
    if (!user) {
      return res.status(404).json({ error: 'user not found' })
    }
    res.json({ friends: user.friends.map(friend => ({ id: friend._id, username: friend.username })) })
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch friends' })
  }
})

router.post('/:username/friends', async (req, res) => {
  const { friendUsername } = req.body
  if (!friendUsername) {
    return res.status(400).json({ error: 'friendUsername required' })
  }
  if (friendUsername === req.params.username) {
    return res.status(400).json({ error: 'cannot friend yourself' })
  }
  try {
    const [user, friend] = await Promise.all([
      req.models.User.findOne({ username: req.params.username }),
      req.models.User.findOne({ username: friendUsername })
    ])
    if (!user || !friend) {
      return res.status(404).json({ error: 'user not found' })
    }
    await Promise.all([
      req.models.User.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } }),
      req.models.User.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } })
    ])
    const updated = await req.models.User.findById(user._id).populate('friends', 'username')
    res.json({ friends: updated.friends.map(f => ({ id: f._id, username: f.username })) })
  } catch (err) {
    res.status(500).json({ error: 'failed to add friend' })
  }
})

router.get('/theme', async (req, res) => {
  const username = req.query.username
  if (!username) {
    return res.status(400).json({ error: 'username query required' })
  }
  try {
    const user = await req.models.User.findOne({ username })
    if (!user) {
      return res.status(404).json({ error: 'user not found' })
    }
    res.json({
      bg_color: user.bg_color,
      button_color: user.button_color,
      text_color: user.text_color
    })
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch theme' })
  }
})

export default router;
