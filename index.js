const express = require('express')
const app = express()
const request = require('request')
const cookieParser = require('cookie-parser')
const uuidv4 = require('uuid/v4')

require('dotenv').config()

app.set('trust proxy', 1)
app.use(cookieParser())

let state

app.get('/', (req, res) => {
  if (typeof req.cookies.SPOTIFY_USER_AUTHORIZATION !== 'undefined' && typeof req.cookies.SPOTIFY_USER_ACCESS !== 'undefined' && typeof req.cookies.SPOTIFY_USER_REFRESH_TOKEN !== 'undefined') {
    getUserDetails(req, (err, data) => {
      if (err) res.write(err)

      res.write(`Logged in as ${data}`)

      getUserPlaylists(req, (err, data) => {
        if (err) res.write(err)

        res.write('Your playlists:<br/>')

        for (let i = 0; i < data.sizeOf(); i++) {
          res.write(data[i])
        }

        res.end()
      })
    })
  } else {
    res.status(200).send(`
    <head>
      <title>Homepage</title>
    </head>
    <body>
      <p>Not logged in.</p>
      <form action="/login" method="GET">
        <button type=submit>Log in</button>
      </form>
    </body>
    `)
  }
})

app.get('/login', (req, res) => {
  state = uuidv4()
  const scopes = 'streaming playlist-read-collaborative playlist-read-private user-library-read'
  res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`)
})

app.get('/auth', (req, res) => {
  if (req.query.state === state) {
    res.cookie('SPOTIFY_USER_AUTHORIZATION', req.query.code, {
      maxAge: 900000
    })
    res.cookie('SPOTIFY_USER_AUTHORIZATION_DATE', Date.now(), {
      maxAge: 900000
    })

    request({
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: `grant_type=authorization_code&code=${req.query.code}&redirect_uri=${process.env.REDIRECT_URI}`
    },
    (error, response, body) => {
      if (error || JSON.parse(body).error) {
        console.log(`[Server] Error while trying to get access token.\n\t${error || JSON.parse(body).error + JSON.parse(body).error_description}`)
        res.status(500).send('An error occurred while trying to log in. Please try again.')
      } else {
        console.log('[Server] Getting access token succeeded.')

        res.cookie('SPOTIFY_USER_ACCESS', JSON.parse(body).access_token, {
          maxAge: 900000
        })
        res.cookie('SPOTIFY_USER_ACCESS_EXPIRES_IN', JSON.parse(body).expires_in, {
          maxAge: 900000
        })
        res.cookie('SPOTIFY_USER_REFRESH_TOKEN', JSON.parse(body).refresh_token, {
          maxAge: 900000
        })

        res.redirect('https://songguesser.julianvos.nl')
      }
    })
  } else {
    console.log('[Server] Invalid state parameter.')
    res.status(500).send('An error occurred while trying to log in. Please try again.')
  }
})

const refresh = (req, res) => {
  let result

  request({
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    body: `grant_type=refresh_token&refresh_token=${req.cookies.SPOTIFY_USER_REFRESH_TOKEN}`
  },
  (error, response, body) => {
    if (error || JSON.parse(body).error) {
      result = 1
      console.log(`[Server] Error while trying to refresh token.\n\t${error || JSON.parse(body).error + JSON.parse(body).error_description}`)
    } else {
      result = 0
      console.log('[Server] Token refresh succeeded.')

      res.cookie('SPOTIFY_USER_ACCESS', JSON.parse(body).access_token, {
        maxAge: 900000
      })
      res.cookie('SPOTIFY_USER_ACCESS_EXPIRES_IN', JSON.parse(body).expires_in, {
        maxAge: 900000
      })
    }
  })

  return result
}

const getUserDetails = (req, callback) => {
  request({
    url: 'https://api.spotify.com/v1/me',
    headers: {
      Authorization: `Bearer ${req.cookies.SPOTIFY_USER_ACCESS}`
    },
    method: 'GET'
  }, (error, response, body) => {
    if (error) return callback(null, error)
    return callback(JSON.parse(body).display_name)
  })
}

const getUserPlaylists = (req, callback) => {
  request({
    url: 'https://api.spotify.com/v1/me/playlists',
    headers: {
      Authorization: `Bearer ${req.cookies.SPOTIFY_USER_ACCESS}`
    },
    method: 'GET'
  }, (error, response, body) => {
    if (error) return callback(null, error)
    return callback(JSON.parse(body).items)
  })
}

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})

exports.refresh = refresh
