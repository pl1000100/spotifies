document.addEventListener('DOMContentLoaded', async () => {
    handleButtons();
    await checkLoginStatus();
    setInterval(handleTime, 1000);
    setInterval(updatePlaybackState, 5000);
});

async function handleTime() {
    const playButton = document.getElementById('play-btn');

    if (playButton.style.display === 'none') {
        const currentTimeDisplay = document.getElementById('current-time');
        const durationDisplay = document.getElementById('duration');
        const progressBarDisplay = document.getElementById('progress-bar');

        const currentTimeMS = formatTimeReverse(currentTimeDisplay)
        const durationMS = formatTimeReverse(durationDisplay)
        const progressBarProgress = (currentTimeMS / durationMS) * 100;

        progressBarDisplay.style.width = `${progressBarProgress}%`;

        currentTimeDisplay.textContent = formatTime(currentTimeMS + 1000);
        if (currentTimeMS > durationMS) {
            await updatePlaybackState()
        }
    }
}

async function checkLoginStatus() {
    chrome.runtime.sendMessage({ action: 'checkLoginStatus' }, (response) => {
        if (response.data.displayName) {
            showView('player');
            updatePlaybackState();
        } else {
            showView('login');
        }
    });

}

function showView(view) {
    switch (view) {
        case 'login':
            document.getElementById('login').style.display = 'block';
            document.getElementById('player').style.display = 'none';
            break;
        case 'player':
            document.getElementById('login').style.display = 'none';
            document.getElementById('player').style.display = 'block';
            break;
        default:
            console.error('Invalid view:', view);
    }
}

function handleButtons() {
    const buttons = [
        {id: 'login-btn', onClickFunc: login},
        {id: 'play-btn', onClickFunc: playTrack},
        {id: 'pause-btn', onClickFunc: pauseTrack},
        {id: 'previous-btn', onClickFunc: previousTrack},
        {id: 'next-btn', onClickFunc: nextTrack},
        {id: 'settings', onClickFunc: logout}
    ]

    for (const button of buttons) {
        const buttonElement = document.getElementById(button.id);
        buttonElement.addEventListener('click', button.onClickFunc);
    }
}

function login() {
    chrome.runtime.sendMessage({ action: 'login' }, (response) => {
        if (response.data.displayName) {
            showView('player');
        } else {
            console.error('Failed to login:', response.error);
        }
    });
}

function logout() {
    chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
        if (response.data) {
            showView('login');
        } else {
            console.error('Failed to logout:', response.error);
        }
    });
}

function previousTrack() {
    chrome.runtime.sendMessage({ action: 'previousTrack' }, (response) => {
        console.log('Previous track response:', response);
        setTimeout(updatePlaybackState, 500);
    })
}

function nextTrack() {
    chrome.runtime.sendMessage({ action: 'nextTrack' }, (response) => {
        console.log('Next track response:', response);
        setTimeout(() => {updatePlaybackState()}, 500);
    })
}

function playTrack() {
    chrome.runtime.sendMessage({ action: 'playTrack' }, (response) => {
        console.log('Play response:', response);
        if (response.data.success) {
            updatePlaybackState(true)
        }
    })
}

function pauseTrack() {
    chrome.runtime.sendMessage({ action: 'pauseTrack' }, (response) => {
        console.log('Pause response:', response);
        if (response.data.success) {
            updatePlaybackState(false)
        }
    })
}

function updatePausePlayButton(isPlaying) {
    const pauseButton = document.getElementById('pause-btn');
    const playButton = document.getElementById('play-btn');
    console.log('PlaybackState response2:', isPlaying);
    if (isPlaying) {
        pauseButton.style.display = 'block';
        playButton.style.display = 'none';
    } else {
        pauseButton.style.display = 'none';
        playButton.style.display = 'block';
    }
}

function updateSongInfo(item) {
    const title = document.getElementById('song-title');
    const artist = document.getElementById('song-artist');
    const albumArt = document.getElementById('album-art');

    let people = item.artists.map(a => a.name).join(', ');

    title.textContent = item.name;
    artist.textContent = people;
    albumArt.src = item.album.images[0].url;
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10? '0' : ''}${seconds}`;
}

function formatTimeReverse(str) {
    const minutes = str.textContent.split(':')[0];
    const seconds = str.textContent.split(':')[1];
    return parseInt(minutes) * 60000 + parseInt(seconds) * 1000;
}

function updateProgressBar(data) {


    const progressBar = document.getElementById('progress-bar');
    const currentTime = document.getElementById('current-time');
    const duration = document.getElementById('duration');

    currentTime.textContent = formatTime(data.progress_ms);
    duration.textContent = formatTime(data.item.duration_ms);
}

async function updatePlaybackState(isPlaying = null) {
    if (isPlaying === true || isPlaying === false) {
        updatePausePlayButton(isPlaying);
    }
    try {
        const resp = await chrome.runtime.sendMessage({action: 'playbackState'});
        console.log('PlaybackState response:', resp);
        updatePausePlayButton(resp.data.is_playing);
        updateSongInfo(resp.data.item);
        updateProgressBar(resp.data);
    } catch (error) {
        console.error('Failed to get playback state:', error);
    }
}