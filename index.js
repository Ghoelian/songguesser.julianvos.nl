const http = new XMLHttpRequest()
const url = window.location.origin === 'https://songguesser.julianvos.nl' ? 'https://api.julianvos.nl/songguesser' : 'http://localhost:3004/songguesser'

http.overrideMimeType('text/html')
http.open('POST', url, true)
http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

http.onload = (e) => {
  const loggedIn = document.getElementById('logged_in')
  if (http.status === 200) {
    console.log('Logged in')
    const select = document.getElementById('playlist_picker')
    const response = JSON.parse(http.responseText)

    loggedIn.innerHTML = `<p>Logged in as ${response.username}</p>`

    let temp = `
            Pick a playlist:<br/>
            <form action="/play/" method="GET">
                <select name="playlist" id="playlist">
        `

    for (let i = 0; i < response.data.length; i++) {
      temp += `<option value="${response.data[i].id}">${response.data[i].name}</option>`
    }

    temp += `
            </select><br/>
            <button type="submit">Play</button>
        </form>
    `

    select.innerHTML += temp
  } else {
    console.log('Not logged in')

    loggedIn.innerHTML = `
        <p>Not logged in.</p>
        <form action="./login/" method="GET">
            <button type="submit">Log in</button>
        </form>
        `
  }
}

const getCookie = (name) => {
  var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)')
  return v ? v[2] : null
}

http.send(`spotify_user_authorization=${getCookie('spotify_user_authorization')}&spotify_user_access=${getCookie('spotify_user_access')}&spotify_user_refresh_token=${getCookie('spotify_user_refresh_token')}`)
