// Welcome to app.js!

let shouldStop = false;
let stopped = false;

const videoElement = document.getElementsByTagName('video')[0];
const downloadLink = document.getElementById('download');
const stopButton = document.getElementById('stop');

// Modal elements
const modal = document.getElementById('filename-modal');
const closeModal = document.querySelector('.modal .close');
const saveFilenameButton = document.getElementById('save-filename');
const filenameInput = document.getElementById('filename-input');

// Show the modal
function showModal(callback) {
    modal.style.display = 'block';
    saveFilenameButton.onclick = function () {
        const filename = filenameInput.value.trim();
        if (filename) {
            callback(filename);
            modal.style.display = 'none';
        }
    };
}

// Close the modal
closeModal.onclick = function () {
    modal.style.display = 'none';
};

// Click outside of modal closes it
window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

function startRecord() {
    $('.btn-info').prop('disabled', true);
    $('#stop').prop('disabled', false);
    $('#download').css('display', 'none');
}

function stopRecord() {
    $('.btn-info').prop('disabled', false);
    $('#stop').prop('disabled', true);
    $('#download').css('display', 'block');
}

const audioRecordConstraints = {
    echoCancellation: true
};

stopButton.addEventListener('click', function() {
    shouldStop = true;
});

const handleRecord = function({stream, mimeType}) {
    startRecord();
    let recordedChunks = [];
    stopped = false;
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }

        if (shouldStop === true && stopped === false) {
            mediaRecorder.stop();
            stopped = true;
        }
    };

    mediaRecorder.onstop = function() {
        const blob = new Blob(recordedChunks, {
            type: mimeType
        });
        recordedChunks = [];
        showModal(function(filename) {
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${filename || 'recording'}.webm`;
            downloadLink.click(); // Automatically trigger the download
        });
    };

    mediaRecorder.start(200);
}

async function recordAudio() {
    const mimeType = 'audio/webm';
    shouldStop = false;
    const stream = await navigator.mediaDevices.getUserMedia({audio: audioRecordConstraints});
    handleRecord({stream, mimeType});
}

async function recordVideo() {
    const mimeType = 'video/webm';
    shouldStop = false;
    const constraints = {
        audio: {
            'echoCancellation': true
        },
        video: {
            'width': {
                'min': 640,
                'max': 1024
            },
            'height': {
                'min': 480,
                'max': 768
            }
        }
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    handleRecord({stream, mimeType});
}

async function recordScreen() {
    const mimeType = 'video/webm';
    shouldStop = false;

    const constraints = {
        video: {
            cursor: 'motion'
        }
    };

    if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
        return window.alert('Sorry, screen recording is not supported by this device.');
    }

    let stream = null;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({video: {cursor: "motion"}, audio: {'echoCancellation': true}});

    if (window.confirm('Record screen and audio?')) {
        const audioContext = new AudioContext();

        const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: {'echoCancellation': true}, video: false });
        const userAudio = audioContext.createMediaStreamSource(voiceStream);

        const audioDestination = audioContext.createMediaStreamDestination();
        userAudio.connect(audioDestination);

        if (displayStream.getAudioTracks().length > 0) {
            const displayAudio = audioContext.createMediaStreamSource(displayStream);
            displayAudio.connect(audioDestination);
        }

        const tracks = [...displayStream.getVideoTracks(), ...audioDestination.stream.getTracks()];
        stream = new MediaStream(tracks);
        handleRecord({stream, mimeType});
    } else {
        stream = displayStream;
        handleRecord({stream, mimeType});
    }
    videoElement.srcObject = stream;
}
