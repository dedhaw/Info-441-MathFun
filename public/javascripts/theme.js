

function applyTheme() {

  // get theme first
  const theme = getTheme()
  if (!theme) {
    return
  }

  console.log(theme)

  // set pickers to be current theme
  document.getElementById('bg-color-picker').value = theme.bg_color
  document.getElementById('button-color-picker').value = theme.button_color
  document.getElementById('text-color-picker').value = theme.text_color

  // set css variables
  document.documentElement.style.setProperty('--bg-color', theme.bg_color)
  document.documentElement.style.setProperty('--button-color', theme.button_color)
  document.documentElement.style.setProperty('--text-color', theme.text_color)
}

function getTheme() {

  // first check cache for existing theme
  let theme = localStorage.getItem('theme')
  if (!theme) {

    // fetch from server
    const username = localStorage.getItem('username')
    if (!username) {
      return
    }
    let theme = fetch(`/users/theme?username=${encodeURIComponent(username)}`)
    if (!theme) {
      return
    }

    theme = theme.json()

    // cache found theme
    localStorage.setItem('theme', JSON.stringify(theme))
  }
  return JSON.parse(theme)
}

function setTheme() {
  const username = localStorage.getItem('username')
  if (!username) {
    return
  }

  // get input values
  const bgColor = document.getElementById('bg-color-picker').value
  const buttonColor = document.getElementById('button-color-picker').value
  const textColor = document.getElementById('text-color-picker').value

  const theme = {
    bg_color: bgColor,
    button_color: buttonColor,
    text_color: textColor
  }

  // save user theme
  fetch(`/users/theme`, {
    method: 'POST',
    headers: {  'Content-Type': 'application/json'  },
    body: JSON.stringify({
      username,
      theme: {
        bg_color: bgColor,
        button_color: buttonColor,
        text_color: textColor
      }
    })
  })

  // save to cache
  localStorage.setItem('theme', JSON.stringify(theme))

  // reapply theme after
  applyTheme()
}