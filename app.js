// Global variables
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let tabTitle = '';

// DOM Elements
const startCaptureBtn = document.getElementById('startCapture');
const stopCaptureBtn = document.getElementById('stopCapture');
const recordingControls = document.getElementById('recordingControls');
const recordingTime = document.getElementById('recordingTime');
const tabInfo = document.getElementById('tabInfo');
const audioPreview = document.getElementById('audioPreview');
const recordedAudio = document.getElementById('recordedAudio');
const transcribeBtn = document.getElementById('transcribeAudio');
const transcriptionOutput = document.getElementById('transcriptionOutput');
const transcriptionStatus = document.getElementById('transcriptionStatus');
const transcriptionText = document.getElementById('transcriptionText');
const copyTranscriptionBtn = document.getElementById('copyTranscription');
const downloadTranscriptionBtn = document.getElementById('downloadTranscription');

// Event listeners
startCaptureBtn.addEventListener('click', startCapture);
stopCaptureBtn.addEventListener('click', stopCapture);
transcribeBtn.addEventListener('click', transcribeAudio);
copyTranscriptionBtn.addEventListener('click', copyTranscription);
downloadTranscriptionBtn.addEventListener('click', downloadTranscription);

// Start capturing audio from a tab
async function startCapture() {
    try {
        // Request user to share a tab
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        // Get the title of the captured tab if possible
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.label) {
            tabTitle = videoTrack.label;
            tabInfo.textContent = `Recording: ${tabTitle}`;
        }
        
        // Stop video track as we only need audio
        stream.getVideoTracks().forEach(track => track.stop());
        
        // Extract audio stream
        const audioStream = new MediaStream(stream.getAudioTracks());
        
        // Create media recorder
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            // Create audio blob and set as source for audio player
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            recordedAudio.src = audioUrl;
            
            // Show audio preview section
            audioPreview.classList.remove('hidden');
            
            // Reset recording UI
            clearInterval(recordingTimer);
            startCaptureBtn.disabled = false;
            recordingControls.classList.add('hidden');
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Update UI
        startCaptureBtn.disabled = true;
        recordingControls.classList.remove('hidden');
        
        // Start recording timer
        recordingStartTime = Date.now();
        updateRecordingTime();
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
    } catch (error) {
        console.error('Error starting capture:', error);
        alert('Error starting capture: ' + error.message);
    }
}

// Stop capturing audio
function stopCapture() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

// Update recording time display
function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    recordingTime.textContent = `${minutes}:${seconds}`;
}

// Transcribe audio using Web Speech API
function transcribeAudio() {
    if (!recordedAudio.src) {
        alert('No recorded audio to transcribe');
        return;
    }
    
    // Show transcription output section
    transcriptionOutput.classList.remove('hidden');
    transcriptionStatus.textContent = 'Transcribing... (This may take a moment)';
    transcriptionText.textContent = '';
    
    // Create a new SpeechRecognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        transcriptionStatus.textContent = 'Speech recognition not supported in this browser. Please try Chrome.';
        return;
    }
    
    const recognition = new SpeechRecognition();
    
    // Configure speech recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Default to English, could be made configurable
    
    let finalTranscript = '';
    let interimTranscript = '';
    
    recognition.onresult = event => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        transcriptionText.innerHTML = finalTranscript + '<i style="color: #888;">' + interimTranscript + '</i>';
    };
    
    recognition.onerror = event => {
        transcriptionStatus.textContent = 'Error occurred in recognition: ' + event.error;
    };
    
    recognition.onend = () => {
        if (finalTranscript === '') {
            transcriptionStatus.textContent = 'No speech detected. Try recording with clearer audio.';
        } else {
            transcriptionStatus.textContent = 'Transcription complete!';
        }
    };
    
    // Play the audio and start recognition at the same time
    recordedAudio.play();
    recognition.start();
    
    // Stop recognition when audio finishes playing
    recordedAudio.onended = () => {
        if (recognition) {
            recognition.stop();
        }
    };
}

// Copy transcription to clipboard
function copyTranscription() {
    const text = transcriptionText.textContent;
    if (!text) {
        alert('No transcription to copy');
        return;
    }
    
    navigator.clipboard.writeText(text)
        .then(() => {
            // Temporary visual feedback
            const originalText = copyTranscriptionBtn.textContent;
            copyTranscriptionBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyTranscriptionBtn.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard: ' + err);
        });
}

// Download transcription as text file
function downloadTranscription() {
    const text = transcriptionText.textContent;
    if (!text) {
        alert('No transcription to download');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

