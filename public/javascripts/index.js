const TIMER_DURATION = 45;
const API = {
    problem: '/game/problem',
    score: '/game/score',
    highScore: '/game/highscore',
};

const elements = {
    timer: document.getElementById('timer-display'),
    score: document.getElementById('score-display'),
    accuracy: document.getElementById('accuracy-display'),
    bestScore: document.getElementById('best-score-display'),
    usernameInput: document.getElementById('username-input'),
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

async function loadProblem() {
    if (state.loadingProblem) return;
    state.loadingProblem = true;
    try {
        const response = await fetch(API.problem);
        if (!response.ok) {
            throw new Error('Failed to fetch problem');
        }
        const data = await response.json();
        state.currentProblem = data;
        elements.problemText.textContent = data.problem;
        elements.answerInput.value = '';
        elements.answerInput.focus();
        setFeedback('New problem ready!', 'info');
    } catch (error) {
        console.error(error);
        setFeedback('Unable to load a problem. Please try again.', 'error');
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
    state.gameActive = active;
    elements.problemCard.classList.toggle('hidden', !active);
    elements.summaryCard.classList.add('hidden');
    elements.answerInput.disabled = !active;
    elements.submitBtn.disabled = !active;
    elements.skipBtn.disabled = !active;
    elements.startBtn.disabled = active;
}

async function startGame() {
    const username = elements.usernameInput.value.trim();
    if (!username) {
        setFeedback('Enter a username first.', 'error');
        return;
    }
    state.username = username;
    resetState();
    toggleGameUI(true);
    await fetchHighScore(username);
    await loadProblem();
    if (!state.currentProblem) {
        toggleGameUI(false);
        return;
    }
    state.gameActive = true;
    setFeedback('Go time! Answer as fast as you can.', 'info');
    startTimer();
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

elements.startBtn.addEventListener('click', startGame);
elements.submitBtn.addEventListener('click', processAnswer);
elements.answerInput.addEventListener('keydown', handleAnswerKey);
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
const statusLog = document.getElementById('status-log')
const searchForm = document.getElementById('search-form')
const searchInput = document.getElementById('search-input')
const searchResults = document.getElementById('search-results')
const friendsForm = document.getElementById('friends-form')
const selfInput = document.getElementById('self-username')
const friendInput = document.getElementById('friend-username')
const friendsList = document.getElementById('friends-list')
const refreshFriendsButton = document.getElementById('refresh-friends')
let authState = { authenticated: false, username: null }

const writeStatus = (message) => {
  if (statusLog) {
    const timestamp = new Date().toLocaleTimeString()
    statusLog.textContent = `[${timestamp}] ${message}`
  }
}

const renderList = (container, items) => {
  if (!container) {
    return
  }
  container.innerHTML = ''
  items.forEach((item) => {
    const li = document.createElement('li')
    li.textContent = item
    container.appendChild(li)
  })
}

const fetchFriends = async () => {
  if (!selfInput || !friendsList) {
    return
  }
  if (!authState.authenticated) {
    writeStatus('Sign in to view friends')
    return
  }
  const username = selfInput.value.trim()
  if (!username) {
    writeStatus('Enter your username to load friends')
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
    renderList(friendsList, data.friends.map((friend) => friend.username))
    writeStatus(`Loaded ${data.friends.length} friends`)
  } catch (err) {
    writeStatus(err.message)
  }
}

if (searchForm && searchInput) {
  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!authState.authenticated) {
      writeStatus('Sign in to search users')
      return
    }
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
      renderList(searchResults, data.users.map((user) => user.username))
      writeStatus(`Found ${data.users.length} user(s)`)
    } catch (err) {
      writeStatus(err.message)
    }
  })
}

if (friendsForm && selfInput && friendInput) {
  friendsForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!authState.authenticated) {
      writeStatus('Sign in to add friends')
      return
    }
    const username = selfInput.value.trim()
    const friendUsername = friendInput.value.trim()
    if (!username || !friendUsername) {
      writeStatus('Enter both usernames')
      return
    }
    try {
      const response = await fetch(`/users/${encodeURIComponent(username)}/friends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ friendUsername })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add friend')
      }
      const data = await response.json()
      renderList(friendsList, data.friends.map((friend) => friend.username))
      writeStatus('Friend added')
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
  if (!authenticated) {
    renderList(searchResults, [])
    renderList(friendsList, [])
  } else if (username && selfInput && !selfInput.value) {
    selfInput.value = username
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
