function getUrlParameter() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    let subtitles = [];
    try {
        if (params.subtitles) {
            // Format: lang1,url1,lang2,url2
            const parts = params.subtitles.split(',');
            for (let i = 0; i < parts.length; i += 2) {
                if (parts[i] && parts[i + 1]) {
                    subtitles.push({
                        lang: decodeURIComponent(parts[i]),
                        url: decodeURIComponent(parts[i + 1])
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error parsing subtitles parameter:', error);
    }

    return {
        url: params.url,
        subtitles: subtitles
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

async function fetchSubtitles(subtitleUrl) {
    try {
        const response = await fetch(subtitleUrl);
        const content = await response.text();
        const blob = new Blob([content], { type: 'text/vtt' });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Failed to fetch subtitles:', error);
        showError('Failed to fetch subtitles');
        return null;
    }
}

async function addSubtitles(video, subtitlesArray) {
    if (!subtitlesArray || !subtitlesArray.length) return;

    for (const subtitle of subtitlesArray) {
        const { lang, url } = subtitle;
        if (!url) continue;

        const processedUrl = await fetchSubtitles(url);
        if (!processedUrl) continue;

        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = lang || 'Unknown';
        track.srclang = lang?.slice(0, 2).toLowerCase() || 'en';
        track.src = processedUrl;
        // Make the first track default
        track.default = subtitlesArray.indexOf(subtitle) === 0;

        video.appendChild(track);

        track.addEventListener('error', (e) => {
            console.error('Error loading subtitles:', e);
            showError(`Failed to load ${lang} subtitles`);
            URL.revokeObjectURL(processedUrl);
        });

        // Clean up blob URL when video is unloaded
        video.addEventListener('unload', () => {
            URL.revokeObjectURL(processedUrl);
        });
    }
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
    const subtitles = params.subtitles;

    if (!videoSrc) return ubelJumpscare();

    addVideo();
    var video = document.getElementById('video');

    if (subtitles && subtitles.length > 0) {
        addSubtitles(video, subtitles);
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