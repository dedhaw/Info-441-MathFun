const TIMER_DURATION = 45;
const API = {
    problem: '/game/problem',
    score: '/game/score',
    highScore: '/game/highscore',
    leaderboard: '/game/leaderboard',
};

const elements = {
    timer: document.getElementById('timer-display'),
    score: document.getElementById('score-display'),
    accuracy: document.getElementById('accuracy-display'),
    bestScore: document.getElementById('best-score-display'),
    versusBtn: document.getElementById('versus-btn'),
    startBtn: document.getElementById('start-game-btn'),
    problemCard: document.getElementById('problem-card'),
    summaryCard: document.getElementById('summary-card'),
    problemText: document.getElementById('problem-text'),
    answerInput: document.getElementById('answer-input'),
    submitBtn: document.getElementById('submit-answer-btn'),
    skipBtn: document.getElementById('skip-problem-btn'),
    feedback: document.getElementById('feedback'),
    summaryScore: document.getElementById('round-score'),
    summaryAccuracy: document.getElementById('round-accuracy'),
    playAgainBtn: document.getElementById('play-again-btn'),
    totalGames: document.getElementById('total-games'),
    totalScore: document.getElementById('total-score'),
    totalWins: document.getElementById('total-wins'),
    leaderboardList: document.getElementById('leaderboard-list'),
};

const state = {
    username: '',
    timer: TIMER_DURATION,
    intervalId: null,
    gameActive: false,
    currentProblem: null,
    score: 0,
    attempts: 0,
    correct: 0,
    loadingProblem: false,
    waitingForStart: false,
    inVersus: false,
    opponentUsername: '',
    selfReady: false,
    opponentReady: false,
    countdownInterval: null,
    prepCountdown: 3,
};

const socketState = {
    ws: null,
    ready: false,
    pendingProblem: null,
    pendingReject: null,
};

function setFeedback(message = '', variant = 'info') {
    const classMap = {
        info: 'feedback-info',
        success: 'feedback-success',
        error: 'feedback-error',
    };
    elements.feedback.textContent = message;
    elements.feedback.className = '';
    if (message) {
        elements.feedback.classList.add(classMap[variant] ?? classMap.info);
    }
}

function updateScoreboard() {
    elements.score.textContent = state.score;
    const accuracy = state.attempts
        ? Math.round((state.correct / state.attempts) * 100)
        : 0;
    elements.accuracy.textContent = `${accuracy}%`;
}

function resetState() {
    state.timer = TIMER_DURATION;
    state.score = 0;
    state.attempts = 0;
    state.correct = 0;
    state.currentProblem = null;
    state.gameActive = false;
    stopTimer();
    updateScoreboard();
    elements.timer.textContent = `${TIMER_DURATION}s`;
    setFeedback('');
    elements.answerInput.value = '';
}

function stopTimer() {
    if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
    }
}

async function fetchHighScore(username) {
    if (!username) {
        elements.bestScore.textContent = '--';
        return;
    }
    try {
        const response = await fetch(
            `${API.highScore}?username=${encodeURIComponent(username)}`
        );
        if (!response.ok) {
            if (response.status === 404) {
                elements.bestScore.textContent = '--';
                return;
            }
            throw new Error('Failed to fetch high score');
        }
        const data = await response.json();
        elements.bestScore.textContent =
            typeof data.highScore === 'number' ? data.highScore : '--';
    } catch (error) {
        console.error(error);
        elements.bestScore.textContent = '--';
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch(API.leaderboard);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = await response.json();
        elements.leaderboardList.innerHTML = data.leaderboard
            .map(u => {
                const name = u.username.length > 22 ? `${u.username.slice(0, 19)}...` : u.username
                return `<li class="leaderboard-item">
                    <span class="leaderboard-rank">${u.rank}</span>
                    <span class="leaderboard-name truncate" title="${u.username}">${name}</span>
                    <span class="leaderboard-score">${u.high_score}</span>
                </li>`;
            })
            .join('');
    } catch (error) {
        console.error(error);
        elements.leaderboardList.innerHTML = '<li>Unable to load leaderboard.</li>';
    }
}

async function loadProblem() {
    if (state.loadingProblem) return;
    state.loadingProblem = true;
    try {
        await requestProblem();
    } catch (error) {
        console.error(error);
        try {
            await fetchHttpProblem();
        } catch (err) {
            console.error(err)
            setFeedback('Unable to load a problem. Please try again.', 'error');
        }
    } finally {
        state.loadingProblem = false;
    }
}

function startTimer() {
    elements.timer.textContent = `${state.timer}s`;
    state.intervalId = setInterval(() => {
        state.timer -= 1;
        elements.timer.textContent = `${state.timer}s`;
        if (state.timer <= 0) {
            endGame('Time is up!');
        }
    }, 1000);
}

function toggleGameUI(active) {
    elements.problemCard.classList.toggle('hidden', !active);
    elements.summaryCard.classList.add('hidden');
    elements.answerInput.disabled = !active;
    elements.submitBtn.disabled = !active;
    elements.skipBtn.disabled = !active;
    elements.startBtn.disabled = active;
}

async function startGame() {
    if (!authState.authenticated || !authState.username) {
        setFeedback('Sign in to start the game.', 'error');
        return;
    }
    state.username = authState.username;
    resetState();
    state.selfReady = false;
    state.opponentReady = false;
    state.prepCountdown = 3;
    toggleGameUI(true);
    state.waitingForStart = true;
    elements.problemText.textContent = 'Click in the answer box to begin.';
    setFeedback('Click in the box to start your 45 seconds.', 'info');
    await Promise.all([
        fetchHighScore(state.username),
        fetchLeaderboard()
    ]);
}

async function beginRoundIfWaiting() {
    if (!state.waitingForStart) return;
    if (state.inVersus && state.opponentUsername) {
        markReadyForVersus();
        return;
    }
    state.waitingForStart = false;
    startRoundNow();
}

function showSummary(message) {
    elements.summaryCard.classList.remove('hidden');
    elements.summaryScore.textContent = `Score: ${state.score}`;
    const accuracy = state.attempts
        ? Math.round((state.correct / state.attempts) * 100)
        : 0;
    elements.summaryAccuracy.textContent = `Accuracy: ${accuracy}%`;
    elements.summaryCard.querySelector('h2').textContent = message;
}

function handleIncomingProblem(data) {
    if (!data) return
    state.currentProblem = data
    elements.problemText.textContent = data.problem
    elements.answerInput.value = ''
    elements.answerInput.focus()
    setFeedback('New problem ready!', 'info')
    if (socketState.pendingProblem) {
        socketState.pendingProblem()
        socketState.pendingProblem = null
        socketState.pendingReject = null
    }
}

async function fetchHttpProblem() {
    const response = await fetch('/game/problem')
    if (!response.ok) {
        throw new Error('HTTP problem fetch failed')
    }
    const data = await response.json()
    handleIncomingProblem(data)
}

async function submitScore() {
    if (!state.username) return;
    try {
        const response = await fetch(API.score, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: state.username,
                score: state.score,
            }),
        });
        if (!response.ok) {
            throw new Error('Score submission failed');
        }
        const data = await response.json();
        if (typeof data.highScore === 'number') {
            elements.bestScore.textContent = data.highScore;
        } else {
            await fetchHighScore(state.username);
        }
        if (data.lifetime) {
            displayLifetimeStats(data.lifetime);
            await fetchLeaderboard();
        }
    } catch (error) {
        console.error(error);
        setFeedback('Could not save your score, but the round is complete.', 'error');
    }
}

function endGame(message) {
    if (!state.gameActive) return;
    stopTimer();
    state.gameActive = false;
    toggleGameUI(false);
    setFeedback(message, 'info');
    showSummary(message);
    submitScore();
    fetchLeaderboard();
}

function processAnswer() {
    if (!state.gameActive || !state.currentProblem) return;
    const value = Number(elements.answerInput.value);
    if (Number.isNaN(value)) {
        setFeedback('Enter a valid number.', 'error');
        return;
    }
    state.attempts += 1;
    if (value === Number(state.currentProblem.answer)) {
        state.correct += 1;
        state.score += 1;
        setFeedback('Correct! Keep going!', 'success');
    } else {
        setFeedback(
            `Not quite. The correct answer was ${state.currentProblem.answer}.`,
            'error'
        );
    }
    updateScoreboard();
    loadProblem();
}

function skipProblem() {
    if (!state.gameActive) return;
    setFeedback('Skipping problem...', 'info');
    loadProblem();
}

function handleAnswerKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        processAnswer();
    }
}

function displayLifetimeStats(stats) {
    elements.totalGames.textContent = stats.total_games ?? 0;
    elements.totalScore.textContent = stats.total_score ?? 0;
    elements.totalWins.textContent = stats.total_wins ?? 0;
}

async function fetchLifetimeStats(username) {
    if (!username) return;
    try {
        const response = await fetch(`${API.highScore}?username=${encodeURIComponent(username)}`);
        if (!response.ok) {
            displayLifetimeStats({ total_games: 0, total_score: 0, total_wins: 0 });
            return;
        }
        const data = await response.json();
        const lifetime = data.lifetime ?? { total_games: 0, total_score: 0, total_wins: 0 };
        displayLifetimeStats(lifetime);
    } catch (err) {
        console.error(err);
        displayLifetimeStats({ total_games: 0, total_score: 0, total_wins: 0 });
    }
}

function ensureSocket() {
    if (socketState.ready && socketState.ws?.readyState === WebSocket.OPEN) {
        return Promise.resolve(socketState.ws)
    }
    return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const ws = new WebSocket(`${protocol}://${window.location.host}/ws?username=${encodeURIComponent(authState.username || 'guest')}`)
        socketState.ws = ws

        const cleanup = () => {
            ws.removeEventListener('open', onOpen)
            ws.removeEventListener('error', onError)
        }

        const onOpen = () => {
            socketState.ready = true
            cleanup()
            resolve(ws)
        }
        const onError = (err) => {
            socketState.ready = false
            cleanup()
            reject(err)
        }

        ws.addEventListener('open', onOpen)
        ws.addEventListener('error', onError)

        ws.addEventListener('close', () => {
            socketState.ready = false
        })

        if (!ws._listenersBound) {
            ws.addEventListener('message', (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    if (msg.type === 'problem' && msg.payload) {
                        handleIncomingProblem(msg.payload)
                    } else if (msg.type === 'challenge' && msg.payload?.from) {
                        handleIncomingChallenge(msg.payload.from)
                    } else if (msg.type === 'challenge_response' && msg.payload) {
                        handleChallengeResponse(msg.payload)
                    } else if (msg.type === 'error' && msg.payload?.message) {
                        setFeedback(msg.payload.message, 'error')
                    }
                } catch (err) {
                    console.error('bad ws message', err)
                }
            })
            ws._listenersBound = true
        }
    })
}

function requestProblem() {
    return new Promise(async (resolve, reject) => {
        try {
            await ensureSocket()
            socketState.pendingProblem = resolve
            socketState.pendingReject = reject
            socketState.ws.send(JSON.stringify({ type: 'problem_request' }))
            setTimeout(() => {
                if (socketState.pendingProblem === resolve) {
                    socketState.pendingProblem = null
                    socketState.pendingReject = null
                    reject(new Error('Timed out waiting for problem'))
                }
            }, 5000)
        } catch (err) {
            reject(err)
        }
    })
}

function markReadyForVersus() {
    if (!state.opponentUsername) return
    state.selfReady = true
    setFeedback('Ready. Waiting for opponent...', 'info')
    ensureSocket().then((ws) => {
        ws.send(JSON.stringify({ type: 'ready', payload: { to: state.opponentUsername } }))
    }).catch(() => {})
    checkVersusCountdown()
}

function checkVersusCountdown() {
    if (!state.selfReady || !state.opponentReady) return
    if (state.countdownInterval) return
    state.prepCountdown = 3
    elements.problemText.textContent = `Starting in ${state.prepCountdown}...`
    state.countdownInterval = setInterval(() => {
        state.prepCountdown -= 1
        if (state.prepCountdown <= 0) {
            clearInterval(state.countdownInterval)
            state.countdownInterval = null
            startRoundNow()
        } else {
            elements.problemText.textContent = `Starting in ${state.prepCountdown}...`
        }
    }, 1000)
}

function handleReady(fromUser) {
    if (fromUser === state.opponentUsername) {
        state.opponentReady = true
        setFeedback(`${fromUser} is ready.`, 'info')
        checkVersusCountdown()
    }
}

function handleIncomingChallenge(fromUser) {
    const accept = window.confirm(`${fromUser} challenged you to a match. Accept?`)
    ensureSocket().then((ws) => {
        ws.send(JSON.stringify({
            type: 'challenge_response',
            payload: { to: fromUser, accept }
        }))
    }).catch(() => {})
    if (accept) {
        state.inVersus = true
        state.opponentUsername = fromUser
        setFeedback(`Accepted challenge from ${fromUser}.`, 'info')
        state.waitingForStart = false
        state.gameActive = true
        toggleGameUI(true)
        elements.problemText.textContent = 'Loading problem...'
        startTimer()
        loadProblem()
    } else {
        setFeedback(`Declined challenge from ${fromUser}`, 'error')
    }
}

function handleChallengeResponse(payload) {
    if (payload.accept) {
        state.inVersus = true
        state.opponentUsername = payload.from
        setFeedback(`${payload.from} accepted your challenge!`, 'success')
        state.waitingForStart = false
        state.gameActive = true
        toggleGameUI(true)
        elements.problemText.textContent = 'Loading problem...'
        startTimer()
        loadProblem()
    } else {
        setFeedback(`${payload.from} declined your challenge.`, 'error')
    }
}

async function sendChallenge() {
    if (!authState.authenticated || !authState.username) {
        setFeedback('Sign in to play versus.', 'error')
        return
    }
    const friend = (window.prompt('Enter friend username to challenge') || '').trim()
    if (!friend) return
    try {
        const ws = await ensureSocket()
        ws.send(JSON.stringify({ type: 'challenge', payload: { to: friend } }))
        setFeedback(`Challenge sent to ${friend}`, 'info')
        state.inVersus = true
        state.opponentUsername = friend
        state.selfReady = false
        state.opponentReady = false
    } catch (err) {
        setFeedback('Could not send challenge.', 'error')
    }
}

elements.startBtn.addEventListener('click', startGame);
if (elements.versusBtn) {
    elements.versusBtn.addEventListener('click', sendChallenge);
}
elements.submitBtn.addEventListener('click', processAnswer);
elements.answerInput.addEventListener('keydown', handleAnswerKey);
elements.answerInput.addEventListener('focus', beginRoundIfWaiting);
elements.answerInput.addEventListener('click', beginRoundIfWaiting);
elements.answerInput.addEventListener('input', beginRoundIfWaiting);
elements.skipBtn.addEventListener('click', skipProblem);
elements.playAgainBtn.addEventListener('click', () => {
    elements.summaryCard.classList.add('hidden');
    elements.startBtn.disabled = false;
    setFeedback('Press start when you are ready for another round.', 'info');
});

const authSections = document.querySelectorAll('[data-auth-section]')
const loginPrompt = document.getElementById('login-prompt')
const userInfo = document.getElementById('user-info')
const sessionButton = document.getElementById('refresh-session')
const signInLink = document.getElementById('signin-link')
const signOutLink = document.getElementById('signout-link')
const statusLog = document.getElementById('status-log')
const searchForm = document.getElementById('search-form')
const searchInput = document.getElementById('search-input')
const searchResults = document.getElementById('search-results')
const friendsList = document.getElementById('friends-list')
const refreshFriendsButton = document.getElementById('refresh-friends')
let authState = { authenticated: false, username: null }

const writeStatus = (message) => {
  if (statusLog) {
    const timestamp = new Date().toLocaleTimeString()
    statusLog.textContent = `[${timestamp}] ${message}`
  }
}

const renderFriends = (items) => {
  if (!friendsList) return
  friendsList.innerHTML = ''
  items.forEach((item) => {
    const li = document.createElement('li')
    li.textContent = item
    friendsList.appendChild(li)
  })
}

const renderSearchResults = (users) => {
  if (!searchResults) return
  searchResults.innerHTML = ''
  users.forEach((user) => {
    const li = document.createElement('li')
    li.style.display = 'flex'
    li.style.alignItems = 'center'
    li.style.justifyContent = 'space-between'
    const name = document.createElement('span')
    name.textContent = user.username
    const addBtn = document.createElement('button')
    addBtn.textContent = 'Add Friend'
    addBtn.type = 'button'
    addBtn.dataset.username = user.username
    li.appendChild(name)
    li.appendChild(addBtn)
    searchResults.appendChild(li)
  })
}

const fetchFriends = async () => {
  if (!friendsList) {
    return
  }
  if (!authState.authenticated) {
    writeStatus('Sign in to view friends')
    return
  }
  const username = authState.username
  if (!username) {
    writeStatus('Missing username')
    return
  }
  try {
    const response = await fetch(`/users/${encodeURIComponent(username)}/friends`, {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Unable to fetch friends')
    }
    const data = await response.json()
    renderFriends(data.friends.map((friend) => friend.username))
    writeStatus(`Loaded ${data.friends.length} friends`)
  } catch (err) {
    writeStatus(err.message)
  }
}

if (searchForm && searchInput) {
  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const query = searchInput.value.trim()
    if (!query) {
      writeStatus('Enter a username to search')
      return
    }
    try {
      const response = await fetch(`/users/search?username=${encodeURIComponent(query)}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Search failed')
      }
      const data = await response.json()
      renderSearchResults(data.users || [])
      writeStatus(`Found ${data.users.length} user(s)`)
    } catch (err) {
      writeStatus(err.message)
    }
  })
}

if (searchResults) {
  searchResults.addEventListener('click', async (event) => {
    if (!(event.target instanceof HTMLButtonElement)) return
    const friendUsername = event.target.dataset.username
    if (!friendUsername) return
    if (!authState.authenticated) {
      writeStatus('Sign in to add friends')
      return
    }
    const username = authState.username
    try {
      const response = await fetch(`/users/${encodeURIComponent(username)}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendUsername })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add friend')
      }
      const data = await response.json()
      renderFriends(data.friends.map((friend) => friend.username))
      writeStatus(`Added ${friendUsername}`)
    } catch (err) {
      writeStatus(err.message)
    }
  })
}

if (refreshFriendsButton) {
  refreshFriendsButton.addEventListener('click', () => {
    fetchFriends()
  })
}

const updateAuthView = (authenticated, username) => {
  authState = { authenticated, username: username || null }
  authSections.forEach((section) => {
    section.hidden = !authenticated
  })
  if (loginPrompt) {
    loginPrompt.hidden = authenticated
  }
  if (userInfo) {
    userInfo.textContent = authenticated ? `Signed in as ${username || 'Unknown user'}` : 'Not signed in'
  }
  if (signInLink) {
    signInLink.style.display = authenticated ? 'none' : 'inline-flex'
  }
  if (signOutLink) {
    signOutLink.style.display = authenticated ? 'inline-flex' : 'none'
  }
  if (!authenticated) {
    renderSearchResults([])
    renderFriends([])
    state.username = ''
  } else {
    state.username = username || ''
    fetchHighScore(state.username)
    fetchLeaderboard()
    ensureSocket().catch(() => {})
  }
}

const checkSession = async () => {
  try {
    const response = await fetch('/session', { credentials: 'include' })
    if (!response.ok) {
      throw new Error('Unable to verify session')
    }
    const data = await response.json()
    updateAuthView(data.authenticated, data.username)
    writeStatus(data.authenticated ? 'Authenticated' : 'Sign in to continue')
    if (data.authenticated) {
      fetchFriends()
    }
    return data
  } catch (err) {
    updateAuthView(false, null)
    writeStatus(err.message)
    return { authenticated: false }
  }
}

if (sessionButton) {
  sessionButton.addEventListener('click', () => {
    checkSession()
  })
}

checkSession()
