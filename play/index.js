const http = new XMLHttpRequest()
const url = `https://api.julianvos.nl/songguesser/play?playlist=${new URL(window.location.href).searchParams.get('playlist')}`

http.open('POST', url, true)
http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

http.onload = (e) => {
    const response = JSON.parse(http.responseText)

    let songs = document.getElementById('songs')

    for (const song of response.songs) {
        songs.innerHTML += `${song.name}<br/>`
    }
}

const getCookie = (name) => {
    var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

http.send(`spotify_user_authorization=${getCookie('spotify_user_authorization')}&spotify_user_access=${getCookie('spotify_user_access')}&spotify_user_refresh_token=${getCookie('spotify_user_refresh_token')}`)