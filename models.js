import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

let models = {}

mongoose.connect(process.env.MONGOOSE_URI)
console.log("connected to mongodb")


// user
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    authId: { type: String, unique: true, sparse: true },
    displayName: { type: String, trim: true },
    email: { type: String, trim: true },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friend_requests: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now }
    }],
    high_score: { type: mongoose.Schema.Types.ObjectId, ref: 'Scores' },
    last_online: Date,
    lifetime: {
        total_games: { type: Number, default: 0 },
        total_score: { type: Number, default: 0 },
        total_wins: { type: Number, default: 0 }
    }
}, { timestamps: true })
models.User = mongoose.model('User', userSchema)
console.log("created user model")

// scores
const scoresSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
})
models.Scores = mongoose.model('Scores', scoresSchema)
console.log("created scores model")


// math problems
const mathProblemSchema = new mongoose.Schema({
    problem: { type: String, required: true },
    answer: { type: Number, required: true },
})
models.MathProblem = mongoose.model('MathProblem', mathProblemSchema)
console.log("created math problem model")

export default models;
