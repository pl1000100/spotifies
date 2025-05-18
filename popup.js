document.addEventListener('DOMContentLoaded', async () => {
    handleButtons();
    handleVolumeSlider();

    await checkLoginStatus();
    await updatePlaybackState();

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
        if (response.error) {
            console.error('Failed to check login status:', response.error);
            showView('login');
        } else {
            updateLoginStatus(response.data.displayName);
            showView('player');
            updatePlaybackState();
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

function handleVolumeSlider(){
    const volumeSlider = document.getElementById('volume-slider');

    volumeSlider.addEventListener('mouseup', () => {
        chrome.runtime.sendMessage({ action: 'changeVolume', volume: volumeSlider.value },
            (response) => {
                if (response.error) {
                    console.error('Failed to change volume:', response.error);
                }
            }
        );
    });
}

function handleButtons() {
    const buttons = [
        {id: 'login-btn', onClickFunc: login},
        {id: 'play-btn', onClickFunc: playTrack},
        {id: 'pause-btn', onClickFunc: pauseTrack},
        {id: 'previous-btn', onClickFunc: previousTrack},
        {id: 'next-btn', onClickFunc: nextTrack},
        {id: 'settings', onClickFunc: logout},
        {id: 'repeat-btn', onClickFunc: toggleRepeat},
    ]

    for (const button of buttons) {
        const buttonElement = document.getElementById(button.id);
        buttonElement.addEventListener('click', button.onClickFunc);
    }
}

function toggleRepeat() {
    const repeatButton = document.getElementById('repeat-btn');

    if (repeatButton.classList.contains("text-white")) {
        chrome.runtime.sendMessage({ action: 'toggleRepeat', type: 'track' }, (response) => {
            repeatButton.classList.remove("text-white");
            repeatButton.classList.add("text-red-500");
        });
    } else if ( repeatButton.classList.contains("text-red-500")) {
        chrome.runtime.sendMessage({ action: 'toggleRepeat', type: 'off' }, (response) => {
            repeatButton.classList.remove("text-white");
            repeatButton.classList.remove("text-red-500");
        });
    } else {
        chrome.runtime.sendMessage({ action: 'toggleRepeat', type: 'context' }, (response) => {
            repeatButton.classList.add("text-white");
            repeatButton.classList.remove("text-red-500");
        });
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
        console.log('Logout response:', response);
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
        setTimeout(updatePlaybackState, 800);
    })
}

function nextTrack() {
    chrome.runtime.sendMessage({ action: 'nextTrack' }, (response) => {
        console.log('Next track response:', response);
        setTimeout(updatePlaybackState, 800);
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
    const currentTime = document.getElementById('current-time');
    const duration = document.getElementById('duration');

    currentTime.textContent = formatTime(data.progress_ms);
    duration.textContent = formatTime(data.item.duration_ms);
}

function updateVolume(volume) {
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.value = volume;
}

function updateRepeatButton(repeatMode) {
    const repeatButton = document.getElementById('repeat-btn');
    if (repeatMode === 'context') {
        repeatButton.classList.remove("text-red-500");
        repeatButton.classList.add("text-white");
    } else if (repeatMode === 'track') {
        repeatButton.classList.remove("text-white");
        repeatButton.classList.add("text-red-500");
    } else {
        repeatButton.classList.remove("text-red-500");
        repeatButton.classList.remove("text-white");
    }
}

async function updatePlaybackState(isPlaying = null) {
    if (isPlaying === true || isPlaying === false) {
        updatePausePlayButton(isPlaying);
    }
    try {
        const resp = await chrome.runtime.sendMessage({action: 'playbackState'});
        if (resp.logged_out) {
            logout();
        }
        console.log('PlaybackState response:', resp);
        // TO-DO: something if is or not playing

        updatePausePlayButton(resp.data.is_playing);
        updateSongInfo(resp.data.item);
        updateProgressBar(resp.data);
        updateVolume(resp.data.device.volume_percent);
        updateRepeatButton(resp.data.repeat_mode);

    } catch (error) {
        console.error('Failed to get playback state:', error);
    }
}