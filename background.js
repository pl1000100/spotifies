chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);
  switch(message.type) {
    case 'spotifyAuthorize':
      handleSpotifyAuthorize(message.data);
      sendResponse({ok: 'ok'});
      break;
    case 'spotifyCurrentSong':
      handleSpotifyCurrentSong(message.data);
    default:
      console.log('This task type don\'t exist', message.type);
      sendResponse({error: 'Wrong task type'});
      break;
  }
});

function handleSpotifyAuthorize(data) {
  const clientId = data.clientId;
  const redirectUrl = data.redirectUrl;
  generateAccessCode(clientId, redirectUrl)
  .then((resp) => {
    console.log('Access Code:', resp.accessCode);
    chrome.storage.local.set({codeVerifier: resp.codeVerifier});
    exchangeCodeForToken(resp.accessCode, redirectUrl, clientId, resp.codeVerifier)
  })
  .catch((error) => {
    console.error('Error generating access code:', error);
  });
}

async function generateAccessCode(clientId, redirectUrl) {
  const codeVerifier  = generateRandomString(64);
  const hashed = await sha256(codeVerifier)
  const codeChallenge = base64encode(hashed);
  
  const scopes = 'user-read-private user-read-email user-read-currently-playing';
  const authUrl = `https://accounts.spotify.com/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}`;

  console.log(authUrl);
  console.log(clientId);
  console.log(redirectUrl);

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    (redirectedTo) => {
      if (chrome.runtime.lastError) {
        console.error('Auth error:', chrome.runtime.lastError.message);
        reject({ error: chrome.runtime.lastError.message });
      } else {
        const url = new URL(redirectedTo);
        const code = url.searchParams.get('code');
        console.log(code);
        
        resolve({accessCode: code, codeVerifier});
      }
    }
  );
  });
}


const exchangeCodeForToken = (code, redirectUri, clientId, codeVerifier) => {
  if (!codeVerifier) {
    console.error('Missing code verifier');
    return;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  });

  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('Token exchange error:', data.error, data.error_description);
    } else {
      console.log('Access token:', data.access_token);
      console.log('Refresh token:', data.refresh_token);
      chrome.storage.local.set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type
      });
    }
  })
  .catch(err => {
    console.error('Token request failed:', err);
  });
};

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const sha256 = async (plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

