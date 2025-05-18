const CONFIG = {
    SPOTIFY_CLIENT_ID: "yourID",
};

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onStartup.addListener(
    () => {
        console.log('Extension started');
    }
)

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function requestUserAuthorization(clientId, redirectUri, scope, codeChallenge) {
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope,
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    }).toString();

    const redirectUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
            {
                url: authUrl.toString(),
                interactive: true
            },
            (responseUrl) => {
                if (chrome.runtime.lastError || !responseUrl) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(responseUrl);
            }
        );
    });

    const urlParams = new URLSearchParams(new URL(redirectUrl).search);
    return urlParams.get('code');
}

async function exchangeCodeForAccessToken(codeVerifier, code, redirectUri, clientId) {
    const url = "https://accounts.spotify.com/api/token";
    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    }

    const body = await fetch(url, payload);
    const response = await body.json();
    return response.access_token;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const clientId = CONFIG.SPOTIFY_CLIENT_ID;
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = 'user-read-private user-read-email user-read-playback-state user-read-currently-playing user-modify-playback-state';

    chrome.storage.local.get(['codeVerifier', 'accessToken'], async (apiData) => {
        let s = new SpotifyApi(
            clientId,
            scope,
            redirectUri,
            apiData.codeVerifier,
            apiData.accessToken
        );

        async function reauth() {
            await s.reauthenticate();
            await chrome.storage.local.set({ accessToken: s.getAccessToken(), codeVerifier: s.getCodeVerifier() });
            console.log('Reauthenticated successfully');
            console.log('Reauthenticated verifier:', s.getCodeVerifier());
            console.log('Reauthenticated token:', s.getAccessToken());
        }

        switch (message.action) {
            case 'checkLoginStatus':
                try {
                    const data = await s.getMe();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to get user data', error);
                    sendResponse({ error });
                }
                break;

            case 'login':
                try {
                    await reauth();
                    const data = await s.getMe();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to reauthenticate', error);
                    sendResponse({ error });
                }
                break;

            case 'logout':
                try {
                    await chrome.storage.local.remove(['codeVerifier', 'accessToken']);
                    sendResponse({ data : 'Logged out' });
                } catch (error) {
                    console.error('Failed to logout', error);
                    sendResponse({ error });
                }
                break;

            case 'me':
                try {
                    const data = await s.getMe();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to get user data', error);
                    sendResponse({ error });
                }
                break;

            case 'playbackState':
                try {
                    const data = await s.getPlaybackState();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to get playback state', error);
                    sendResponse({ error });
                }
                break;

            case'previousTrack':
                try {
                    const data = await s.previousTrack();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to get previousTrack', error);
                    sendResponse({ error });
                }
                break;

            case 'nextTrack':
                try {
                    const data = await s.nextTrack();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to get nextTrack', error);
                    sendResponse({ error });
                }
                break;

            case 'playTrack':
                try {
                    const data = await s.playTrack();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to play track', error);
                    sendResponse({ error });
                }
                break;

            case 'pauseTrack':
                try {
                    const data = await s.pauseTrack();
                    sendResponse({ data });
                } catch (error) {
                    console.error('Failed to pause track', error);
                    sendResponse({ error });
                }
                break;

            default:
                console.error('This task type doesn\'t exist:', message.action);
                sendResponse({ error: 'Wrong task type' });
                break;
        }
    });

    return true; // keep message channel open
});


async function reauth(s) {
    await s.reauthenticate()
    await chrome.storage.local.set({ accessToken: s.getAccessToken(), codeVerifier: s.getCodeVerifier() });
    console.log('Reauthenticated successfully');
    console.log('2Code verifier:', s.getCodeVerifier());
    console.log('2Access token:', s.getAccessToken());
    return s;
}


async function getNewLoginData(clientId, redirectUri, scope) {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    const code = await requestUserAuthorization(clientId, redirectUri, scope, codeChallenge)
    const accessToken = await exchangeCodeForAccessToken(codeVerifier, code, redirectUri, clientId)

    return {
        codeVerifier,
        accessToken
    };
}



class SpotifyApi {
    constructor(clientId, scope, redirectUri, codeVerifier, accessToken) {
        this.codeVerifier = codeVerifier;
        this.accessToken = accessToken;
        this.clientId = clientId;
        this.scope = scope;
        this.redirectUri = redirectUri;
    }

    getAccessToken() {
        return this.accessToken;
    }

    getCodeVerifier() {
        return this.codeVerifier;
    }

    async reauthenticate() {
        const data = await getNewLoginData(this.clientId, this.redirectUri, this.scope);
        this.codeVerifier = data.codeVerifier;
        this.accessToken = data.accessToken;
        console.log('Reauthenticated with new access token');
        console.log('New access token:', this.accessToken);
        console.log('New code verifier:', this.codeVerifier);
        return data;
    }

    async getPlaybackState() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player?access_token=${this.accessToken}`);
            if (response.status === 200) {
                const resp = await response.json();
                return {
                    isPlaying: resp.is_playing,
                    progressMS: resp.progress_ms,
                    item: resp.item
                };
            }
            if (response.status === 204) {
                return {
                    isPlaying: false,
                    progressMS: 0,
                    item: null
                };
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }


    async getMe() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/me?access_token=${this.accessToken}`)
            if (response.ok) {
                const resp = await response.json();
                return {
                    displayName: resp.display_name,
                    email: resp.email
                };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async previousTrack() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/previous`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                }
            });
            if (response.ok) {
                return {
                    success: true
                };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async nextTrack() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/next`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                }
            });
            if (response.ok) {
                return {
                    success: true
                };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async pauseTrack() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/pause`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                }
            });
            if (response.ok) {
                return {
                    success: true
                };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async playTrack() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                    // TO-DO possible starting playing track as arg
                }
            });
            if (response.ok) {
                return {
                    success: true
                };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }
}