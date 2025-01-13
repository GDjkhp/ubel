function getUrlParameter() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    return params.url;
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

function ubelJumpscare() {
    const sus = `
        <img src="https://gdjkhp.github.io/img/ubel.jpeg">
    `;
    const body = document.querySelector('body');
    body.insertAdjacentHTML('beforeend', sus);
}

function main() {
    var videoSrc = getUrlParameter();
    if (!videoSrc) return ubelJumpscare();
    addVideo();
    var video = document.getElementById('video');

    if (Hls.isSupported()) {
        var hls = new Hls({
            debug: true,
            enableWorker: true
        });

        // Handle manifest loading error
        hls.on(Hls.Events.MANIFEST_LOADING, function() {
            console.log('Attempting to load manifest...');
        });

        hls.loadSource(videoSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('Manifest loaded successfully');
            video.play().catch(function(error) {
                console.log("Auto-play prevented:", error);
            });
        });
        
        // Enhanced error handling
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError('Network error: ' + data.details);
                        console.error('Network error:', data.details);
                        // Attempt to recover
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
        // For Safari and iOS devices
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