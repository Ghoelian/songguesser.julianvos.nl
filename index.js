const http = new XMLHttpRequest()
const url = 'https://api.julianvos.nl/songguesser'

http.open('POST', url, true)
http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

http.onload = (e) => {
    let logged_in = document.getElementById('logged_in')
    if (http.status === 200) {
        console.log('Logged in')

        window.onSpotifyWebPlaybackSDKReady = () => {
            const token = '[My Spotify Web API access token]'
            const player = new Spotify.Player({
                name: 'Web Playback SDK Quick Start Player',
                getOAuthToken: cb => {
                    cb(token)
                }
            })

            player.addListener('initialization_error', ({
                message
            }) => {
                console.error(message);
            })
            player.addListener('authentication_error', ({
                message
            }) => {
                console.error(message);
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
            });

            player.addListener('player_state_changed', state => {
                console.log(state)
            })

            player.addListener('ready', ({
                device_id
            }) => {
                console.log('Ready with Device ID', device_id)
            })

            player.addListener('not_ready', ({
                device_id
            }) => {
                console.log('Device ID has gone offline', device_id)
            })

            player.connect()
        }

        let select = document.getElementById('playlist_picker')
        const response = JSON.parse(http.responseText)

        logged_in.innerHTML = `<p>Logged in as ${response.username}</p>`

        let temp = `
            Pick a playlist:<br/>
            <form action="/play/" method="GET">
                <select name="playlist" id="playlist">
        `

        for (let i = 0; i < response.data.length; i++) {
            temp += `<option value="${response.data[i].id}">${response.data[i].name}</option>`
        }

        temp += `
            </select><br/>
            <button type="submit">Play</button>
        </form>
    `

    select.innerHTML += temp



    } else {
        console.log('Not logged in')

        logged_in.innerHTML = `
        <p>Not logged in.</p>
        <form action="./login/" method="GET">
            <button type="submit">Log in</button>
        </form>
        `
    }
}

const getCookie = (name) => {
    var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

http.send(`spotify_user_authorization=${getCookie('spotify_user_authorization')}&spotify_user_access=${getCookie('spotify_user_access')}&spotify_user_refresh_token=${getCookie('spotify_user_refresh_token')}`)