const http = new XMLHttpRequest()
const url = window.location.origin === 'https://songguesser.julianvos.nl' ? 'https://api.julianvos.nl/songguesser/login' : 'http://localhost:3004/songguesser/login'

http.overrideMimeType('text/html')
http.open('GET', url)
http.send()

http.onload = (e) => {
  console.log(http.responseText)
  const response = JSON.parse(http.responseText)
  document.cookie = `state=${response.state};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`

  window.location.replace(response.redirect)
}
