document.addEventListener('DOMContentLoaded', () => {
  handleSettingsButton();
  handleSaveButton();
  handleLoginButton();
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
      console.log('read:');
      console.log(result.clientId);
      console.log(result.redirectUrl);
      
      chrome.runtime.sendMessage(
        { 
          type: 'authorize_spotify',
          clientId: result.clientId,
          redirectUrl: result.redirectUrl
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          } else {
            console.log('Received auth code:', response.code);
            chrome.storage.local.set({ code: response.code });
          }
        }
      );
    });
  });
}

function displayToggleNoneFlex(id) {
  const elem = document.getElementById(id);
  const elemDisplay = window.getComputedStyle(elem).display;
  elemDisplay === 'none' ? elem.style.display = 'flex' : elem.style.display = 'none';
}