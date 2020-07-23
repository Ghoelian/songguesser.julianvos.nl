const http = new XMLHttpRequest()
const url = window.location.origin === 'https://songguesser.julianvos.nl' ? `https://api.julianvos.nl/songguesser/play/?playlist=${new URL(window.location.href).searchParams.get('playlist')}` : `http://localhost:3004/songguesser/play/?playlist=${new URL(window.location.href).searchParams.get('playlist')}`
let player

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = getCookie('spotify_user_access')
  // eslint-disable-next-line no-undef
  player = new Spotify.Player({
    name: 'Spotify Song Guesser',
    getOAuthToken: cb => {
      cb(token)
    }
  })

  player.addListener('initialization_error', ({
    message
  }) => {
    console.error(message)
  })
  player.addListener('authentication_error', ({
    message
  }) => {
    console.error(message)
  })
  player.addListener('account_error', ({
    message
  }) => {
    console.error(message)
  })
  player.addListener('playback_error', ({
    message
  }) => {
    console.error(message)
  })

  player.addListener('player_state_changed', state => {
    console.log(state)
  })

  player.addListener('ready', ({
    // eslint-disable-next-line camelcase
    device_id
  }) => {
    console.log('Ready with Device ID', device_id)
  })

  player.addListener('not_ready', ({
    // eslint-disable-next-line camelcase
    device_id
  }) => {
    console.log('Device ID has gone offline', device_id)
  })

  player.connect()
}

http.overrideMimeType('text/html')
http.open('POST', url, true)
http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

http.onload = (e) => {
  const response = JSON.parse(http.responseText)

  const songs = document.getElementById('songs')

  for (const song of response.songs) {
    songs.innerHTML += `<a onclick="playSong('${song.uri}')">${song.name}</a><br/>`
  }
}

const getCookie = (name) => {
  var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)')
  return v ? v[2] : null
}

// eslint-disable-next-line no-unused-vars
const playSong = (uri) => {
  play({
    playerInstance: player,
    spotifyURI: uri
  })
}

const play = ({
  spotifyURI,
  playerInstance: {
    _options: {
      getOAuthToken,
      id
    }
  }
}) => {
  console.log('Playing song')
  getOAuthToken(accessToken => {
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [spotifyURI] }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    })
  })
}

http.send(`spotify_user_authorization=${getCookie('spotify_user_authorization')}&spotify_user_access=${getCookie('spotify_user_access')}&spotify_user_refresh_token=${getCookie('spotify_user_refresh_token')}`)
