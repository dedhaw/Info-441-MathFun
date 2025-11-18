import express from 'express';
import { model } from 'mongoose';

var router = express.Router();

async function getCurrentUser(req) {
  if (!req.session.isAuthenticated) {
    return null;
  }
  const email = req.session.account.username;
  let foundUser = await model.User.findOne({ email: email });
  return foundUser;
}

router.get('/friends', async (req, res) => {
  try {
    if (req.session.isAuthenticated) {
        res.status(401).json({ error: 'Unauthorized' });
    }

    foundUser = await getCurrentUser(req)
    if (!foundUser) {
      res.status(404).json({ error: 'User not found' });
    }
    res.json({ friends: foundUser.friends });

  } catch(error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

router.get('/friend-requests', async (req, res) => {

  try {
    if (req.session.isAuthenticated) {
        res.status(401).json({ error: 'Unauthorized' });
      }

    foundUser = await getCurrentUser(req)

    if (!foundUser) {
      res.status(404).json({ error: 'User not found' });
    }

    res.json({ friend_requests: foundUser.friend_requests });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

router.post('/send-friend-request', (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    // check null
    if (!recipent) {
      res.status(400).json({ error: 'Recipent is required' });
    }
    // check if user exists
    let foundRecipent = model.User.findOne({ _id: recipent })

    if (!foundRecipent) {
      res.status(404).json({ error: 'Recipent not found' });
    }

    // add friend request to recipent
    foundRecipent.friend_requests.push({
      from: req.user._id,
      date: new Date(),
    })

    foundRecipent.save();
    res.json({ message: 'Friend request sent' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

router.post('/respond-friend-request', async (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    const { requestId, accept } = req.body;

    let foundUser = await getCurrentUser(req)
    if (!foundUser) {
      res.status(404).json({ error: 'User not found' });
    }
    // find friend request
    const friendRequest = foundUser.friend_requests.id(requestId);
    if (!friendRequest) {
      res.status(404).json({ error: 'Friend request not found' });
    }

    if (accept) {

      // get friend
      const friend = await model.User.findById(friendRequest.from);
      if (!friend) {
        res.status(404).json({ error: 'sender not found' });
      }

      // add to eachothers friends list
      foundUser.friends.push(friendRequest.from);
      friend.friends.push(foundUser._id);

      await friend.save();

    } else {
      // remove friend request
      foundUser.friend_requests.id(requestId).remove();
    }

    await foundUser.save();

    res.json({ message: 'Friend request responded to' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

router.delete('/remove-friend', async (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await getCurrentUser(req)
    const friend = await model.User.findById(req.body.friendId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    }
    if (!friend) {
      res.status(404).json({ error: 'Friend not found' });
    }

    // remove eachother from friends list
    user.friends.pull(friend._id);
    friend.friends.pull(user._id);
    await user.save();
    await friend.save();
    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})

export default router;