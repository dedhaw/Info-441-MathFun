import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

let models = {}

mongoose.connect(process.env.MONGOOSE_URI)
console.log("connected to mongodb")

const userSchema = new mongoose.Schema({
    username: String,
    high_score: mongoose.Schema.Types.ObjectId,
})

const scoresSchema = new mongoose.Schema({
    username: String,
    score: Number,
    date: Date,
})

const mathProblemSchema = new mongoose.Schema({
    problem: String,
    answer: Number,
})