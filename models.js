  import mongoose from "mongoose";
  import dotenv from 'dotenv';
  dotenv.config();

  let models = {}

  mongoose.connect(process.env.MONGOOSE_URI)
  console.log("connected to mongodb")


  // user
  const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      friend_requests: [{
          from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          date: Date
      }],
      high_score: mongoose.Schema.Types.ObjectId,
      last_online: Date,
  })
  models.User = mongoose.model('User', userSchema)
  console.log("created user model")

  // scores
  const scoresSchema = new mongoose.Schema({
      username: String,
      score: Number,
      date: Date,
  })
  models.Scores = mongoose.model('Scores', scoresSchema)
  console.log("created scores model")


  // math problems
  const mathProblemSchema = new mongoose.Schema({
      problem: String,
      answer: Number,
  })
  models.MathProblem = mongoose.model('MathProblem', mathProblemSchema)
  console.log("created math problem model")

  export default models;