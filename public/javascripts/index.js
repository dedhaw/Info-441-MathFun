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
