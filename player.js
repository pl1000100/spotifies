const UNAUTHORIZED = 0;
const IN_PROGRESS = 1;
const AUTHORIZED = 2;
const ERROR = 3;

class Player {
    #clientId = null;
    #redirectUri = null; //set while registering app
    #scopes = 'user-read-private user-read-email';
    #state = UNAUTHORIZED;
    constructor(redirectUri) {
        this.#redirectUri = redirectUri;
        this.#state = UNAUTHORIZED;
    }
    authorize(clientId) {
        this.#clientId = clientId;
        const authUrl = `https://accounts.spotify.com/authorize` +
        `?client_id=${this.#clientId}` +
        `&response_type=code&` +
        `redirect_uri=${encodeURIComponent(this.#redirectUri)}` +
        `&scope=${encodeURIComponent(this.#scopes)}`;
        this.#state = IN_PROGRESS;
        console.log(authUrl);
        
        chrome.identity.launchWebAuthFlow(
            {
              url: authUrl,
              interactive: true
            },
            (redirectedTo) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
              }
        
              // Parse 'code' from redirectedTo URL
              const url = new URL(redirectedTo);
              const code = url.searchParams.get('code');
              saveKeyLocal('code', code)
              console.log('Authorization code:', code);
            }
          );
    }
}