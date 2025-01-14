function getUrlParameter() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    return {
        url: params.url,
        subtitles: params.subtitles,
        decrypt: params.decrypt === 'true'
    };
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.style.display = 'block';
    errorElement.textContent = message;
}

function addVideo() {
    const videoHtml = `
        <div class="video-container">
            <video id="video" controls></video>
            <div id="error-message"></div>
        </div>
    `;
    const body = document.querySelector('body');
    body.insertAdjacentHTML('beforeend', videoHtml);
}

// Decrypt function using CryptoJS
function decryptSubtitles(encryptedContent) {
    const KISSKH_KEY = '8056483646328763';
    const KISSKH_INITIALIZATION_VECTOR = '6852612370185273';

    try {
        // Convert the key and IV to WordArray
        const key = CryptoJS.enc.Utf8.parse(KISSKH_KEY);
        const iv = CryptoJS.enc.Utf8.parse(KISSKH_INITIALIZATION_VECTOR);

        // Decrypt
        const decrypted = CryptoJS.AES.decrypt(encryptedContent, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        // Convert to UTF-8 string
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

async function fetchAndProcessSubtitles(subtitleUrl, shouldDecrypt) {
    try {
        const response = await fetch(subtitleUrl);
        let content = await response.text();

        if (shouldDecrypt) {
            try {
                content = decryptSubtitles(content);
            } catch (error) {
                console.error('Failed to decrypt subtitles:', error);
                showError('Failed to decrypt subtitles');
                return null;
            }
        }

        // Create a Blob with the processed subtitles
        const blob = new Blob([content], { type: 'text/vtt' });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Failed to fetch subtitles:', error);
        showError('Failed to fetch subtitles');
        return null;
    }
}

async function addSubtitles(video, subtitleUrl, shouldDecrypt, label = 'English') {
    if (!subtitleUrl) return;

    const processedUrl = await fetchAndProcessSubtitles(subtitleUrl, shouldDecrypt);
    if (!processedUrl) return;

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = label;
    track.srclang = 'en';
    track.src = processedUrl;
    track.default = true;

    video.appendChild(track);

    track.addEventListener('error', (e) => {
        console.error('Error loading subtitles:', e);
        showError('Failed to load subtitles');
        URL.revokeObjectURL(processedUrl); // Clean up the blob URL
    });

    // Clean up blob URL when video is unloaded
    video.addEventListener('unload', () => {
        URL.revokeObjectURL(processedUrl);
    });
}

function ubelJumpscare() {
    const sus = `
        <img src="https://gdjkhp.github.io/img/ubel.jpeg">
    `;
    const body = document.querySelector('body');
    body.insertAdjacentHTML('beforeend', sus);
}

function main() {
    const params = getUrlParameter();
    const videoSrc = params.url;
    const subtitlesSrc = params.subtitles;
    const shouldDecrypt = params.decrypt;

    if (!videoSrc) return ubelJumpscare();

    addVideo();
    var video = document.getElementById('video');

    if (subtitlesSrc) {
        addSubtitles(video, subtitlesSrc, shouldDecrypt);
    }

    if (Hls.isSupported()) {
        var hls = new Hls({
            debug: true,
            enableWorker: true
        });

        hls.on(Hls.Events.MANIFEST_LOADING, function() {
            console.log('Attempting to load manifest...');
        });

        hls.loadSource(videoSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
            console.log('Manifest loaded successfully');

            if (data.subtitles && data.subtitles.length > 0) {
                console.log('Manifest includes subtitle tracks:', data.subtitles);
            }

            video.play().catch(function(error) {
                console.log("Auto-play prevented:", error);
            });
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError('Network error: ' + data.details);
                        console.error('Network error:', data.details);
                        setTimeout(() => {
                            hls.startLoad();
                        }, 1000);
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showError('Media error: ' + data.details);
                        console.error('Media error:', data.details);
                        hls.recoverMediaError();
                        break;
                    default:
                        showError('Fatal error: ' + data.details);
                        console.error('Fatal error, cannot recover:', data.details);
                        break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        video.addEventListener('loadedmetadata', function() {
            video.play().catch(function(error) {
                console.log("Auto-play prevented:", error);
            });
        });

        video.addEventListener('error', function(e) {
            showError('Video loading error: ' + video.error.message);
            console.error('Video error:', video.error);
        });
    }
}

main();