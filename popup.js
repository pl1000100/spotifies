document.addEventListener('DOMContentLoaded', async () => {
    handleButtons();
    handleVolumeSlider();
    handlePlaybar();

    await checkLoginStatus();
    await updatePlaybackState();

    setInterval(handleTime, 1000);
    setInterval(updatePlaybackState, 5000);
});

function handlePlaybar() {
    const playbar = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const durationTime = document.getElementById('duration')
    const currentTimeDisplay = document.getElementById('current-time');
    playbar.addEventListener('mouseup', async (e) => {
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const durationMS = formatTimeReverse(durationTime.textContent);
        const mSeconds = Math.floor(percentage * durationMS);

        chrome.runtime.sendMessage({action: 'setPlayTime', mSeconds}, (response) => {
            if (response.error) {
                console.error('Failed to setPlayTime:', response.error);
            } else {
                currentTimeDisplay.textContent = formatTime(mSeconds);
                progressBar.style.width = `${percentage}%`;
            }
        });
    });
}

async function handleTime() {
    const playButton = document.getElementById('play-btn');

    if (playButton.style.display === 'none') {
        const currentTimeDisplay = document.getElementById('current-time');
        const durationDisplay = document.getElementById('duration');
        const progressBarDisplay = document.getElementById('progress-bar');

        const currentTimeMS = formatTimeReverse(currentTimeDisplay.textContent)
        const durationMS = formatTimeReverse(durationDisplay.textContent)
        const progressBarProgress = (currentTimeMS / durationMS) * 100;

        progressBarDisplay.style.width = `${progressBarProgress}%`;

        currentTimeDisplay.textContent = formatTime(currentTimeMS + 1000);
        if (currentTimeMS > durationMS) {
            await updatePlaybackState()
        }
    }
}

async function checkLoginStatus() {
    chrome.runtime.sendMessage({action: 'checkLoginStatus'}, (response) => {
        if (response.error) {
            console.error('Failed to check login status:', response.error);
            showView('login');
        } else {
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
            document.getElementById('song-list').style.display = 'none';
            break;
        case 'player':
            document.getElementById('login').style.display = 'none';
            document.getElementById('player').style.display = 'block';
            document.getElementById('song-list').style.display = 'none';
            break;
        case 'song-list':
            document.getElementById('login').style.display = 'none';
            document.getElementById('player').style.display = 'none';
            document.getElementById('song-list').style.display = 'block';
            break;
        default:
            console.error('Invalid view:', view);
    }
}

function handleVolumeSlider() {
    const volumeSlider = document.getElementById('volume-slider');

    volumeSlider.addEventListener('mouseup', () => {
        chrome.runtime.sendMessage({action: 'changeVolume', volume: volumeSlider.value},
            (response) => {
                if (response.error) {
                    console.error('Failed to change volume:', response.error);
                }
            }
        );
    });
}

function handlePlaylist() {
    showView('song-list')
    togglePlaylist();
}

async function togglePlaylist() {
    // const songList = document.getElementById('song-list');
    const songListItems = document.getElementById('song-list-items');

    const nextSongs = await chrome.runtime.sendMessage({action: 'getNextSongs'});

    console.log('Next songs:', nextSongs);

    const songs = nextSongs.data.queue.map(song => ({
        title: song.name,
        artist: song.artists.map(arti => arti.name).join(', '),
        uri: song.uri,
    }));

    songListItems.innerHTML = '';
    songs.forEach((song, index) => {
        if (index < 5) {
            const li = document.createElement('li');
            li.className = "flex items-center justify-between p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition cursor-pointer";
            li.innerHTML = `
        <div>
            <p class="text-sm font-medium">${song.title}</p>
            <p class="text-xs text-gray-400">${song.artist}</p>
        </div>
        <i class="fas fa-play text-green-400"></i>
    `;
            li.querySelector('i').addEventListener('click', () => {
                for (let j = 0; j < index + 1; j++) {
                    nextTrack();
                }
                showView('player');
            });
            songListItems.appendChild(li);
        }
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
        {id: 'playlist-btn', onClickFunc: handlePlaylist},
        {id: 'backToPlayer-btn', onClickFunc: handleBackToPlayer},
    ]

    for (const button of buttons) {
        const buttonElement = document.getElementById(button.id);
        buttonElement.addEventListener('click', button.onClickFunc);
    }
}

function handleBackToPlayer() {
    showView('player');
}

function toggleRepeat() {
    const repeatButton = document.getElementById('repeat-btn');

    if (repeatButton.classList.contains("text-white")) {
        chrome.runtime.sendMessage({action: 'toggleRepeat', type: 'track'}, (response) => {
            repeatButton.classList.remove("text-white");
            repeatButton.classList.add("text-red-500");
        });
    } else if (repeatButton.classList.contains("text-red-500")) {
        chrome.runtime.sendMessage({action: 'toggleRepeat', type: 'off'}, (response) => {
            repeatButton.classList.remove("text-white");
            repeatButton.classList.remove("text-red-500");
        });
    } else {
        chrome.runtime.sendMessage({action: 'toggleRepeat', type: 'context'}, (response) => {
            repeatButton.classList.add("text-white");
            repeatButton.classList.remove("text-red-500");
        });
    }
}

function login() {
    chrome.runtime.sendMessage({action: 'login'}, (response) => {
        if (response.data.displayName) {
            showView('player');
        } else {
            console.error('Failed to login:', response.error);
        }
    });
}

function logout() {
    chrome.runtime.sendMessage({action: 'logout'}, (response) => {
        if (response.data) {
            showView('login');
        } else {
            console.error('Failed to logout:', response.error);
        }
    });
}

function previousTrack() {
    chrome.runtime.sendMessage({action: 'previousTrack'}, (response) => {
        setTimeout(updatePlaybackState, 800);
    })
}

function nextTrack() {
    chrome.runtime.sendMessage({action: 'nextTrack'}, (response) => {
        setTimeout(updatePlaybackState, 800);
    })
}

function playTrack() {
    chrome.runtime.sendMessage({action: 'playTrack'}, (response) => {
        if (response.data.success) {
            updatePlaybackState(true)
        }
    })
}

function pauseTrack() {
    chrome.runtime.sendMessage({action: 'pauseTrack'}, (response) => {
        if (response.data.success) {
            updatePlaybackState(false)
        }
    })
}

function updatePausePlayButton(isPlaying) {
    const pauseButton = document.getElementById('pause-btn');
    const playButton = document.getElementById('play-btn');
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
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function formatTimeReverse(str) {
    const minutes = str.split(':')[0];
    const seconds = str.split(':')[1];
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

        updatePausePlayButton(resp.data.is_playing);
        updateSongInfo(resp.data.item);
        updateProgressBar(resp.data);
        updateVolume(resp.data.device.volume_percent);
        updateRepeatButton(resp.data.repeat_state);
    } catch (error) {
        console.error('Failed to get playback state:', error);
    }
}