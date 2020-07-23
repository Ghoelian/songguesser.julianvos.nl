const http = new XMLHttpRequest()

const getCookie = (name) => {
  var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)')
  return v ? v[2] : null
}

const url = window.location.origin === 'https://songguesser.julianvos.nl' ? `https://api.julianvos.nl/songguesser/auth?state=${getCookie('state')}&code=${new URL(window.location.href).searchParams.get('code')}` : `http://localhost:3004/songguesser/auth?state=${getCookie('state')}&code=${new URL(window.location.href).searchParams.get('code')}`

http.overrideMimeType('text/html')
http.open('GET', url)
http.send()
console.log(url)
http.onload = (e) => {
  console.log(http.responseText)
  const response = JSON.parse(http.responseText)

  document.cookie = `spotify_user_authorization=${response.SPOTIFY_USER_AUTHORIZATION};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`
  document.cookie = `spotify_user_access=${response.SPOTIFY_USER_ACCESS};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`
  document.cookie = `spotify_user_access_expires_in=${response.SPOTIFY_USER_ACCESS_EXPIRES_IN};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`
  document.cookie = `spotify_user_refresh_token=${response.SPOTIFY_USER_REFRESH_TOKEN};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`

  window.location.replace('/')
}
