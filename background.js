chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed!");
});

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

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'authorize_spotify'){
    const codeVerifier  = generateRandomString(64);
    const hashed = await sha256(codeVerifier)
    const codeChallenge = base64encode(hashed);
    
    const scopes = 'user-read-private user-read-email';
    const authUrl = `https://accounts.spotify.com/authorize` +
      `?client_id=${message.clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(message.redirectUrl)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&code_challenge_method=S256` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}`;

    console.log(authUrl);
    console.log(message);
    console.log(message.clientId);
    console.log(message.redirectUrl);

    await chrome.storage.local.set({ codeVerifier });

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (redirectedTo) => {
        if (chrome.runtime.lastError) {
          console.error('Auth error:', chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          const url = new URL(redirectedTo);
          const code = url.searchParams.get('code');
          console.log(code);
          
          sendResponse({ code });
          exchangeCodeForToken(code, message.redirectUrl, message.clientId, codeVerifier);
        }
      }
    );

    return true;
  }
  
});
