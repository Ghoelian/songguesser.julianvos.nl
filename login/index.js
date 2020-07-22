const http = new XMLHttpRequest()
const url = 'https://api.julianvos.nl/songguesser/login'

http.open('GET', url)
http.send()

http.onreadystatechange = (e) => {
    const response = JSON.parse(http.responseText)
    document.cookie = `state=${response.state};path=/;max-age=${60*60*24*7}`

    window.location.replace(response.redirect)
}
