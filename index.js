const express = require('express')
const app = express()
const request = require('request')
const cookieParser = require('cookie-parser')
const uuidv4 = require('uuid/v4')

require('dotenv').config()

app.set('trust proxy', 1)
app.use(cookieParser())

let state
let totalLength = 0

app.get('/', (req, res) => {
  res.write(`
  <html>
  <head>Song Guesser</head>
  <body>
  `)

  if (typeof req.cookies.SPOTIFY_USER_AUTHORIZATION !== 'undefined' && typeof req.cookies.SPOTIFY_USER_ACCESS !== 'undefined' && typeof req.cookies.SPOTIFY_USER_REFRESH_TOKEN !== 'undefined') {
    getUserDetails(req, (err, data) => {
      if (err) res.write(err)

      res.write(`Logged in as ${data}<br/>`)

      getUserPlaylists(req, (err, data) => {
        if (err) res.write(err)

        res.write('Your playlists:<br/>')
        for (let i = 0; i < data.length; i++) {
          totalLength++
          res.write(data[i] + '<br/>')
        }

        res.write(`
        ${totalLength}
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
    (err, response, body) => {
      if (err || JSON.parse(body).err) {
        console.log(`[Server] err while trying to get access token.\n\t${err || JSON.parse(body).err + JSON.parse(body).err_description}`)
        res.status(500).send('An err occurred while trying to log in. Please try again.')
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

        res.redirect('/')
      }
    })
  } else {
    console.log('[Server] Invalid state parameter.')
    res.status(500).send('An err occurred while trying to log in. Please try again.')
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
  (err, response, body) => {
    if (err || JSON.parse(body).err) {
      result = 1
      console.log(`[Server] err while trying to refresh token.\n\t${err || JSON.parse(body).err + JSON.parse(body).err_description}`)
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
  }, (err, response, body) => {
    if (err) return callback(err)
    return callback(null, JSON.parse(body).display_name, req)
  })
}

const getUserPlaylists = (req, callback) => {
  let total = 0
  let whole = 0
  let remainder = 0
  let offset = 0
  const items = []

  new Promise((resolve, reject) => {
    request({
      url: 'https://api.spotify.com/v1/me/playlists?limit=50&offset=0',
      headers: {
        Authorization: `Bearer ${req.cookies.SPOTIFY_USER_ACCESS}`
      },
      method: 'GET'
    }, (err, response, body) => {
      if (err) reject(err)
      total = JSON.parse(body).total
      whole = Math.floor(total / 50)
      remainder = JSON.parse(body).total % 50

      resolve()
    })
  }).then((result) => {
    new Promise((resolve, reject) => {
      for (let i = 0; i < whole; i++) {
        request({
          url: `https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.cookies.SPOTIFY_USER_ACCESS}`
          },
          method: 'GET'
        }, (err, response, body) => {
          if (err) throw err
          offset += 50
          const parsedBody = JSON.parse(body).items

          for (let j = 0; j < parsedBody.length; j++) {
            items.push(parsedBody[j].name)
          }

          if (i === whole - 1) {
            resolve()
          }
        })
      }
    }).then((result) => {
      new Promise((resolve, reject) => {
        request({
          url: `https://api.spotify.com/v1/me/playlists?limit=${remainder}&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.cookies.SPOTIFY_USER_ACCESS}`
          },
          method: 'GET'
        }, (err, result, body) => {
          if (err) throw err
          const parsedBody = JSON.parse(body).items

          for (let i = 0; i < parsedBody.length; i++) {
            items.push(parsedBody[i].name)
          }

          resolve()
        })
      }).then((result) => {
        callback(null, items)
      })
    })
  })
}

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})

exports.refresh = refresh
