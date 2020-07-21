const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const spotify = require('./lib/spotify_api')
const uuidv4 = require('uuid/v4')

require('dotenv').config()

app.set('trust proxy', 1)
app.use(cookieParser())

let state

app.get('/', (req, res) => {
  res.write(`
  <html>
  <head>
  <meta charset="UTF-8">
  <title>Song Guesser</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
  </head>
  <body style="font-family:'Roboto', sans-serif;">
  `)

  if (typeof req.cookies.SPOTIFY_USER_AUTHORIZATION !== 'undefined' && typeof req.cookies.SPOTIFY_USER_ACCESS !== 'undefined' && typeof req.cookies.SPOTIFY_USER_REFRESH_TOKEN !== 'undefined') {
    spotify.getUserDetails(req, (err, data) => {
      if (err) res.write(err)

      res.write(`Logged in as ${data}<br/><br/>`)

      spotify.getUserPlaylists(req, (err, data) => {
        if (err) res.write(err)

        res.write('Pick a playlists:<br/><form action="/play" method="GET"><select name="playlist" id="playlist">')
        for (let i = 0; i < data.length; i++) {
          res.write(`<option value="${data[i].id}">${data[i].name}</option>`)
        }

        res.write(`
        </select><br/>
        <button type="submit">Play</button>
        </form>
        </body>
        </html>
        `)
        res.end()
      })
    })
  } else {
    res.write(`
      <p>Not logged in.</p>
      <form action="/login" method="GET">
        <button type=submit>Log in</button>
      </form>
    `)

    res.write(`
    </body>
    </html>
    `)

    res.end()
  }
})

app.get('/play', (req, res) => {
  spotify.getPlaylistSongs(req, (err, data) => {
    if (err === 1) {
      res.redirect('/')
    } else if (err) {
      throw err
    }

    res.write(`
    <html>
    <head>
    <meta charset="UTF-8">
    <title>Song Guesser</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    </head>
    <body style="font-family:'Roboto', sans-serif;">
    `)
    for (let i = 0; i < data.length; i++) {
      res.write(`${data[i].track.name}<br/>`)
    }
    res.write(`
    </body>
    </html>
    `)
    res.end()
  })
})

app.get('/login', (req, res) => {
  state = uuidv4()
  const scopes = 'streaming playlist-read-collaborative playlist-read-private user-library-read'
  res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`)
})

app.get('/auth', (req, res) => {
  spotify.authenticateUser(req, state, (err, result) => {
    if (err) throw err

    res.cookie('SPOTIFY_USER_AUTHORIZATION', result.SPOTIFY_USER_AUTHORIZATION, {
      maxAge: 900000
    })
    res.cookie('SPOTIFY_USER_AUTHORIZATION_DATE', result.SPOTIFY_USER_AUTHORIZATION_DATE, {
      maxAge: 900000
    })
    res.cookie('SPOTIFY_USER_ACCESS', result.SPOTIFY_USER_ACCESS, {
      maxAge: 900000
    })
    res.cookie('SPOTIFY_USER_ACCESS_EXPIRES_IN', result.SPOTIFY_USER_ACCESS_EXPIRES_IN, {
      maxAge: 900000
    })
    res.cookie('SPOTIFY_USER_REFRESH_TOKEN', result.SPOTIFY_USER_REFRESH_TOKEN, {
      maxAge: 900000
    })

    res.redirect('/')
  })
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})
