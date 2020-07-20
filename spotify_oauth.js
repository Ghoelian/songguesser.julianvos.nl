const request = require('request')
const uuidv4 = require('uuid/v4')

let state

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

      req.session.save()
    }
  })

  return result
}

const login = (res) => {
  state = uuidv4()
  const scopes = 'playlist-modify-public playlist-modify-private'
  res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`)
  console.log(`https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`)
}

const authenticate = (req, res) => {
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
      console.log(`Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`)
      console.log(`grant_type=authorization_code&code=${req.session.SPOTIFY_USER_AUTHORIZATION}&redirect_uri=${process.env.REDIRECT_URI}`)
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

  return result
}

exports.refresh = refresh
exports.login = login
exports.authenticate = authenticate
