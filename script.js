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
        });
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
        controlBar: {
            skipButtons: {
                backward: 5,
                forward: 5,
            },
            remainingTimeDisplay: {
                displayNegative: false,
            }
        },
    });

    player.src({
        src: videoSrc
    });

    player.mobileUi({
        fullscreen: {
            enterOnRotate: true,
            exitOnRotate: true,
            lockOnRotate: true,
            lockToLandscapeOnEnter: false,
            disabled: false
        },
        touchControls: {
            seekSeconds: 3,
            tapTimeout: 300,
            disableOnEnd: false,
            disabled: false,
        }
    });

    let qualityLevels = player.qualityLevels();
    let showLevels = () => {
        for (var i = 0; i < qualityLevels.length; i++) {
            let qualityLevel = qualityLevels[i];
            console.log(`${qualityLevel.height}p:`, qualityLevel.enabled);
        }
    }

    qualityLevels.on('change', function () {
        level = qualityLevels.selectedIndex
        for (var i = 0; i < qualityLevels.length; i++) {
            let qualityLevel = qualityLevels[i];
            qualityLevel.enabled = i === level ? true : false;
        }
        // showLevels();
        // console.log('Resolution:', qualityLevels[level].width, "x", qualityLevels[level].height);
    });

    let enableQualityLevel = level => {
        qualityLevels.selectedIndex_ = level;
        qualityLevels.trigger({ type: 'change', selectedIndex: level });
    }

    player.hlsQualitySelector({
        displayCurrentQuality: true,
    });

    // Add subtitles if available
    if (subtitles && subtitles.length > 0) {
        addSubtitles(player, subtitles);
    }

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
        player.play().catch(function(error) {
            console.log("Auto-play prevented:", error);
        });
    });

    player.on('loadedmetadata', function () {
        enableQualityLevel(0); // enable highest quality level -> 0: highest, length-1: lowest
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