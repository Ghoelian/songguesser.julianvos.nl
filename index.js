const express = require('express')
const app = express()
const request = require('request')
const session = require('express-session')
const uuidv4 = require('uuid/v4')

require('dotenv').config()

app.set('trust proxy', 1)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

let state

app.get('/login', (req, res) => {
  state = uuidv4()
  const scopes = 'playlist-modify-public playlist-modify-private'
  res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`)
})

app.get('/auth', (req, res) => {
  let result

  if (req.query.state === state) {
    req.session.SPOTIFY_USER_AUTHORIZATION = req.query.code
    req.session.SPOTIFY_USER_AUTHORIZATION_DATE = Date.now()

    request({
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: `grant_type=authorization_code&code=${req.session.SPOTIFY_USER_AUTHORIZATION}&redirect_uri=${process.env.REDIRECT_URI}`
    },
    (error, response, body) => {
      if (error || JSON.parse(body).error) {
        console.log(`[Server] Error while trying to get access token.\n\t${error || JSON.parse(body).error + JSON.parse(body).error_description}`)
        result = 1
      } else {
        console.log('[Server] Getting access token succeeded.')

        req.session.SPOTIFY_USER_ACCESS = JSON.parse(body).access_token
        req.session.SPOTIFY_USER_ACCESS_EXPIRES_IN = JSON.parse(body).expires_in
        req.session.SPOTIFY_USER_REFRESH_TOKEN = JSON.parse(body).refresh_token

        req.session.save((err) => {
          if (err) console.log(`[Server] Error saving session.\n\t${err}`)
          result = 1
        })
      }
    })
  } else {
    result = 1
  }

  if (result === 1) {
    res.status(500).send('An error occurred while trying to log in. Please try again.')
  } else {
    // res.status(200).send(req.session.SPOTIFY_USER_ACCESS)
    console.log(req.session.SPOTIFY_USER_ACCESS)
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
    body: `grant_type=refresh_token&refresh_token=${req.session.SPOTIFY_USER_REFRESH_TOKEN}`
  },
  (error, response, body) => {
    if (error || JSON.parse(body).error) {
      result = 1
      console.log(`[Server] Error while trying to refresh token.\n\t${error || JSON.parse(body).error + JSON.parse(body).error_description}`)
    } else {
      result = 0
      console.log('[Server] Token refresh succeeded.')

      req.session.SPOTIFY_USER_ACCESS = JSON.parse(body).access_token
      req.session.SPOTIFY_USER_ACCESS_EXPIRES_IN = JSON.parse(body).expires_in
    }
  })

  return result
}

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})

exports.refresh = refresh
