document.addEventListener('DOMContentLoaded', async () => {
  try {
    handleSongData(await getPlaybackState());
  } catch {
    login();
  }
  handleSettingsButton();
  handleSaveButton();
  handleLoginButton();
  handlePrevButton();
  handleNextButton();
  handlePausePlayButton();
});

function handleSongData(playbackState) {
  const title = document.getElementById('songTitle');
  const author = document.getElementById('songAuthor');
  title.innerText = playbackState.title;
  author.innerText = playbackState.author;
}

function handleSettingsButton(){
  document.getElementById('settingsButton').addEventListener('click', () => {
    displayToggleNoneFlex('player');
    displayToggleNoneFlex('settings');
    chrome.storage.local.get(['clientId', 'redirectUrl'], (result) => {
      const clientInput = document.getElementById('clientId').value = result.clientId;
      const redirectInput = document.getElementById('redirectUrl').value = result.redirectUrl;

    });
  });
}

function handleSaveButton() {
  const button = document.getElementById('saveButton');
  button.addEventListener('click', () => {
    const clientId = document.getElementById('clientId').value;
    const redirectUrl = document.getElementById('redirectUrl').value;
    chrome.storage.local.set({ clientId: clientId });
    chrome.storage.local.set({ redirectUrl: redirectUrl });
  });
}

function handleLoginButton() {
  const button = document.getElementById('loginButton');
  button.addEventListener('click', () => {
    login()
  });
}

function login() {
  chrome.storage.local.get(['clientId', 'redirectUrl'], (result) => {
      chrome.runtime.sendMessage(
        { 
          type: 'spotifyAuthorize',
          data: {
            clientId: result.clientId,
            redirectUrl: result.redirectUrl
          }
        }
      );
    });
}

function handlePrevButton() {
  const button = document.getElementById('prevButton');
  button.addEventListener('click', async () => {
    previousSong()
    .then(() =>  getPlaybackState())
    .then((res) => handleSongData(res))
    .catch(error => {
      console.error('Error fetching data:', error);
    });
  });
}

function previousSong() {
  return new Promise((resolve, reject) => { 
    chrome.storage.local.get(['accessToken'], (r) => {
      fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${r.accessToken}`,
        }
      })
      .then(() => setTimeout(resolve, 1000)) // api don't update its data immedietly
      .catch(error => {
        console.error('Error fetching data:', error);
        reject(error);
      });
    });
  });
}

function handleNextButton() {
  const button = document.getElementById('nextButton');
  button.addEventListener('click', async () => {
    nextSong()
    .then(() =>  getPlaybackState())
    .then((res) => handleSongData(res))
    .catch(error => {
      console.error('Error fetching data:', error);
    });
  });
}

function nextSong() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['accessToken'], (r) => {
      fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${r.accessToken}`,
        }
      })
     .then(() => setTimeout(resolve, 1000)) // api don't update its data immedietly
      .catch(error => {
        console.error('Error fetching data:', error);
        reject(error);
      });
    });
  });
}

function handlePausePlayButton() {
  const button = document.getElementById('pausePlayButton');
  button.addEventListener('click', async() => {
    try {
      const playbackState = await getPlaybackState();
      playbackState.isPlaying ? pause() : play();
    } catch (error) {
      console.error('Error in handlePausePlayButton():', error);
    }
  });
}

function pause() {
  chrome.storage.local.get(['accessToken'], (r) => {
    fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${r.accessToken}`,
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
  });
}

function play() {
  chrome.storage.local.get(['accessToken'], (r) => {
    fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${r.accessToken}`,
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
  });
}

function getPlaybackState() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['accessToken'], (r) => {
      fetch('https://api.spotify.com/v1/me/player', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${r.accessToken}`,
        }
      })
     .then(response => response.json())
     .then(data => {
        resolve({
          isPlaying: data.is_playing,
          title: data.item.name,
          author: data.item.artists[0].name,
        });
      })
     .catch(error => {
        console.error('Error fetching data:', error);
        reject(error);
      });
    });
  });  
}

function displayToggleNoneFlex(id) {
  const elem = document.getElementById(id);
  const elemDisplay = window.getComputedStyle(elem).display;
  elemDisplay === 'none' ? elem.style.display = 'flex' : elem.style.display = 'none';
}