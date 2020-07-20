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
  if (typeof req.headers.cookie !== 'undefined') {
    if (typeof req.headers.cookie.SPOTIFY_USER_AUTHORIZATION !== 'undefined' && typeof req.headers.cookieSPOTIFY_USER_ACCESS !== 'undefined' && typeof req.headers.cookie.SPOTIFY_USER_REFRESH_TOKEN !== 'undefined') {
      request({
        url: 'https://api.spotify.com/v1/me',
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_USER_ACCESS).toString('base64')}`
        },
        method: 'GET'
      }, (error, response, body) => {
        if (error) throw error
        res.status(200).send(JSON.parse(body).display_name)
      })
    } else {
      res.status(200).send('Not logged in')
    }
  }
})

app.get('/login', (req, res) => {
  state = uuidv4()
  const scopes = 'streaming playlist-read-collaborative playlist-read-private user-library-read'
  res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`)
})

app.get('/auth', (req, res) => {
  if (req.query.state === state) {
    res.headers.cookie.SPOTIFY_USER_AUTHORIZATION = req.query.code
    res.headers.cookie.SPOTIFY_USER_AUTHORIZATION_DATE = Date.now()

    request({
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: `grant_type=authorization_code&code=${req.cookie('SPOTIFY_USER_AUTHORIZATION')}&redirect_uri=${process.env.REDIRECT_URI}`
    },
    (error, response, body) => {
      if (error || JSON.parse(body).error) {
        console.log(`[Server] Error while trying to get access token.\n\t${error || JSON.parse(body).error + JSON.parse(body).error_description}`)
        res.status(500).send('An error occurred while trying to log in. Please try again.')
      } else {
        console.log('[Server] Getting access token succeeded.')

        res.headers.cookie.SPOTIFY_USER_ACCESS = JSON.parse(body).access_token
        res.headers.cookie.SPOTIFY_USER_ACCESS_EXPIRES_IN = JSON.parse(body).expires_in
        res.headers.cookie.SPOTIFY_USER_REFRESH_TOKEN = JSON.parse(body).refresh_token

        req.session.save((err) => {
          if (err) {
            console.log(`[Server] Error saving session.\n\t${err}`)
            res.status(500).send('An error occurred while trying to log in. Please try again.')
          }

          res.status(200).send('Success.')
        })
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
    body: `grant_type=refresh_token&refresh_token=${req.cookie('SPOTIFY_USER_REFRESH_TOKEN')}`
  },
  (error, response, body) => {
    if (error || JSON.parse(body).error) {
      result = 1
      console.log(`[Server] Error while trying to refresh token.\n\t${error || JSON.parse(body).error + JSON.parse(body).error_description}`)
    } else {
      result = 0
      console.log('[Server] Token refresh succeeded.')

      res.headers.cookie.SPOTIFY_USER_ACCESS = JSON.parse(body).access_token
      res.headers.cookie.SPOTIFY_USER_ACCESS_EXPIRES_IN = JSON.parse(body).expires_in
    }
  })

  return result
}

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})

exports.refresh = refresh
