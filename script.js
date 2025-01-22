function getUrlParameter() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    let subtitles = [];
    try {
        if (params.subtitles) {
            // Format: lang1;url1;lang2;url2
            const parts = params.subtitles.split(';');
            for (let i = 0; i < parts.length; i += 2) {
                if (parts[i] && parts[i + 1]) {
                    subtitles.push({
                        lang: decodeURIComponent(parts[i]).replace("+", " "),
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
        <div id="error-message"></div>
        <div class="video-container">
            <video id="video" class="video-js vjs-theme-forest" controls></video>
        </div>
    `;
    const body = document.querySelector('body');
    body.insertAdjacentHTML('beforeend', videoHtml);
}

function addSubtitles(player, subtitlesArray) {
    if (!subtitlesArray || !subtitlesArray.length) return;

    for (const subtitle of subtitlesArray) {
        const { lang, url } = subtitle;
        if (!url) continue;

        player.addRemoteTextTrack({
            kind: 'subtitles',
            srclang: lang?.slice(0, 2).toLowerCase() || 'en',
            label: lang || 'Unknown',
            src: url,
            default: subtitlesArray.indexOf(subtitle) === 0
        }, false); // Add false to prevent automatic loading
    }
}

function ubelJumpscare() {
    const sus = `
        <img class="ubel" src="https://gdjkhp.github.io/img/ubel.jpeg">
    `;
    const body = document.querySelector('body');
    body.insertAdjacentHTML('beforeend', sus);
}

function initializePlayer(videoSrc, subtitles) {
    addVideo();
    const player = videojs('video', {
        fill: true,
        enableSmoothSeeking: true,
        playbackRates: [0.5, 1, 1.5, 2],
        html5: {
            nativeTextTracks: false, // Force non-native text tracks
            vhs: {
                overrideNative: true,
                enableLowInitialPlaylist: true,
                smoothQualityChange: true,
                allowSeeksWithinUnsafeLiveWindow: false,
                handlePartialData: true
            }
        },
        controlBar: {
            skipButtons: {
                backward: 5,
                forward: 5
            },
            remainingTimeDisplay: {
                displayNegative: false
            }
        },
        // Improve seeking behavior
        inactivityTimeout: 3000,
        preload: 'auto',
        loadingSpinner: true,
        suppressNotSupportedError: true
    });

    // Configure source with better buffering
    player.src({
        src: videoSrc,
        type: videoSrc.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
    });

    // Add subtitles if available
    if (subtitles && subtitles.length > 0) {
        addSubtitles(player, subtitles);
    }

    // Handle seeking to prevent desyncs
    let seekInProgress = false;
    player.on('seeking', function() {
        seekInProgress = true;
    });

    player.on('seeked', function() {
        seekInProgress = false;
        // Ensure audio and video are in sync after seeking
        if (Math.abs(player.currentTime() - player.audioTracks()[0]?.currentTime) > 0.1) {
            const currentTime = player.currentTime();
            player.currentTime(currentTime);
        }
    });

    // Monitor for potential desync
    player.on('timeupdate', function() {
        if (!seekInProgress && player.audioTracks()[0]) {
            const videoDiff = Math.abs(player.currentTime() - player.audioTracks()[0].currentTime);
            if (videoDiff > 0.3) { // If desync is more than 300ms
                console.log('Correcting A/V sync');
                const currentTime = player.currentTime();
                player.currentTime(currentTime);
            }
        }
    });

    // Error handling
    player.on('error', function() {
        const error = player.error();
        let errorMessage = 'Video playback error';
        
        if (error) {
            switch (error.code) {
                case 1:
                    errorMessage = 'Video loading aborted';
                    break;
                case 2:
                    errorMessage = 'Network error';
                    break;
                case 3:
                    errorMessage = 'Video decoding failed';
                    break;
                case 4:
                    errorMessage = 'Video not supported';
                    break;
            }
        }
        
        showError(errorMessage);
    });

    // Autoplay with error handling
    player.ready(function() {
        // Ensure proper subtitle loading
        player.textTracks().on('addtrack', function() {
            const tracks = player.textTracks();
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].kind === 'subtitles') {
                    tracks[i].mode = i === 0 ? 'showing' : 'hidden';
                }
            }
        });

        player.play().catch(function(error) {
            console.log("Auto-play prevented:", error);
        });
    });
}

function main() {
    const params = getUrlParameter();
    const videoSrc = params.url;
    const subtitles = params.subtitles;
    if (!videoSrc) return ubelJumpscare();
    initializePlayer(videoSrc, subtitles);
}

main();