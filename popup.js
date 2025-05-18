document.addEventListener('DOMContentLoaded', async () => {
    handleButtons()
    await checkLoginStatus()


});

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
async function updatePlaybackState(isPlaying=null) {
    if (isPlaying === true || isPlaying === false) {
        updatePausePlayButton(isPlaying);
    } else {
        try {
            const resp = await chrome.runtime.sendMessage({ action: 'playbackState' });
            updatePausePlayButton(resp.data.isPlaying);
            updateSongInfo(resp.data.item);
        } catch (error) {
            console.error('Failed to get playback state:', error);
            return;
        }

    }



}