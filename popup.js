document.addEventListener('DOMContentLoaded', () => {
  handleSettingsButton();
  handleSaveButton();
  handleLoginButton();
  handlePrevButton();
});

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
    chrome.storage.local.get(['clientId', 'redirectUrl'], (result) => {
      chrome.runtime.sendMessage(
        { 
          type: 'spotifyAuthorize',
          data: {
            clientId: result.clientId,
            redirectUrl: result.redirectUrl
          }
        },
        (response) => {
          console.log('Resp in popup: ' + response);
          console.log(response);

          // if (chrome.runtime.lastError) {
          //   console.error(chrome.runtime.lastError.message);
          // } else {
          //   console.log('Received auth code:', response.code);
          //   chrome.storage.local.set({ code: response.code });
          // }
        }
      );
    });
  });
}

function handlePrevButton() {
  const button = document.getElementById('prevButton');
  button.addEventListener('click', () => {
    chrome.storage.local.get(['accessToken'], (r) => {
      fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${r.accessToken}`,
        }
      })
      .then(response => response.json()) // Parse the response as JSON
      .then(data => {
        console.log(data); // Use the data from the response
      })
      .catch(error => {
        console.error('Error fetching data:', error); // Handle any errors
      });
    });
  });
    
}

function displayToggleNoneFlex(id) {
  const elem = document.getElementById(id);
  const elemDisplay = window.getComputedStyle(elem).display;
  elemDisplay === 'none' ? elem.style.display = 'flex' : elem.style.display = 'none';
}