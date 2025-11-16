import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sessions from 'express-session';

import dotenv from 'dotenv';
dotenv.config();

import models from './models.js';

// vars



// use .env variables
const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: "/redirect",
    },
	system: {
    	loggerOptions: {
        	loggerCallback(loglevel, message, containsPii) {
            	console.log(message);
        	},
        	piiLoggingEnabled: false,
        	logLevel: 3,
    	}
	}
};
const oneDay = 1000 * 60 * 60 * 24

// routing

var app = express();

app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false
}))

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) =>{
    req.models = models
    next()
})

export default app;