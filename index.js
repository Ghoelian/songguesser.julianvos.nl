const express = require('express')
const app = express()
const spotify = require('./spotify_oauth')
const session = require('express-session')

require('dotenv').config()

app.set('trust proxy', 1)
app.use(express.static('public'))
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

app.get('/login', (req, res) => {
  spotify.login(res)
})

app.get('/auth', (req, res) => {
  if (spotify.authenticate(req, res) === 1) {
    res.status(500).send('An error occurred while trying to log in. Please try again.')
  } else {
    res.status(200).send(req.session.SPOTIFY_USER_ACCESS)
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})
