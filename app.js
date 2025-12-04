import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import WebAppAuthProvider from 'msal-node-wrapper'
import sessions from 'express-session';
import { createServer } from 'http';

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
dotenv.config();

// import activityRouter from './routes/controllers/activity.js';
import gameRouter from './routes/controllers/game.js';
// import matchRouter from './routes/controllers/match.js';
import usersRouter from './routes/controllers/users.js';
import models from './models.js';
import { setupWebsocket } from './websocket/index.js';

// vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tenantId = 'common';

// use .env variables
const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${tenantId}`,
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

var app = express();
const server = createServer(app);

app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false
}))


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.enable('trust proxy')
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) =>{
    req.models = models
    next()
})

// auth
const authProvider = await WebAppAuthProvider.WebAppAuthProvider.initialize(authConfig);
app.use(authProvider.authenticate());

// routing

// app.use('/activity', activityRouter);
app.use('/game', gameRouter);
// app.use('/match', matchRouter);
app.use('/users', usersRouter);

// ensure logged-in users exist in DB
app.use(async (req, _res, next) => {
  try {
    const isAuthenticated = typeof req.authContext?.isAuthenticated === 'function' ? req.authContext.isAuthenticated() : false
    if (!isAuthenticated || typeof req.authContext.getAccount !== 'function') {
      return next()
    }
    const account = req.authContext.getAccount()
    const authId = account?.homeAccountId || account?.localAccountId || null
    const username = account?.username || account?.name || null
    if (!username) {
      return next()
    }
    const update = {
      username,
      authId,
      displayName: account?.name || username,
      email: account?.username || undefined,
      last_online: new Date()
    }
    await req.models.User.findOneAndUpdate(
      { $or: [{ authId }, { username }] },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  } catch (err) {
    console.error('user sync failed', err)
  }
  next()
});

app.get('/signin', (req, res, next) => {
  return req.authContext.login({
   	postLoginRedirectUri: "/", // redirect here after login
  })(req, res, next);
});

app.get('/signout', (req, res, next) => {
  return req.authContext.logout({
    postLogoutRedirectUri: "/", // redirect here after logout
  })(req, res, next);
});

app.get('/session', (req, res) => {
  const isAuthenticated = typeof req.authContext?.isAuthenticated === 'function' ? req.authContext.isAuthenticated() : false
  const account = isAuthenticated && typeof req.authContext.getAccount === 'function' ? req.authContext.getAccount() : null
  res.json({
    authenticated: isAuthenticated,
    username: account?.username ?? account?.name ?? null
  })
})

setupWebsocket(server, models)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`)
})

export default app;
