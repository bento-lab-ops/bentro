// Timer and Phase Management
import { sendWebSocketMessage } from './api.js';
import { loadBoard, isBoardManager } from './board.js';
import { i18n } from './i18n.js';

export function startTimer() {
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 5;
    window.timerSeconds = minutes * 60;

    sendWebSocketMessage('timer_start', { seconds: window.timerSeconds });
    startTimerUI(window.timerSeconds);
}

export function startTimerUI(seconds) {
    window.timerSeconds = seconds;

    const isManager = typeof isBoardManager === 'function' ? isBoardManager() : false;
    // Safe check if elements exist
    if (document.getElementById('startTimerBtn')) document.getElementById('startTimerBtn').style.display = 'none';
    if (document.getElementById('stopTimerBtn')) document.getElementById('stopTimerBtn').style.display = isManager ? 'inline-block' : 'none';

    if (window.timerInterval) clearInterval(window.timerInterval);

    window.timerInterval = setInterval(() => {
        window.timerSeconds--;
        updateTimerDisplay(window.timerSeconds);
        sendWebSocketMessage('timer_update', { seconds: window.timerSeconds });

        if (window.timerSeconds <= 0) {
            playTimerSound();
            stopTimer();
        }
    }, 1000);
}

export function stopTimer() {
    sendWebSocketMessage('timer_stop', {});
    stopTimerUI();
}

export function stopTimerUI() {
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
        window.timerInterval = null;
    }

    const isManager = typeof isBoardManager === 'function' ? isBoardManager() : false;
    if (document.getElementById('startTimerBtn')) document.getElementById('startTimerBtn').style.display = isManager ? 'inline-block' : 'none';
    if (document.getElementById('stopTimerBtn')) document.getElementById('stopTimerBtn').style.display = 'none';
    window.timerSeconds = 0;
    updateTimerDisplay(0);
}

export function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

export function switchPhase() {
    window.currentPhase = window.currentPhase === 'input' ? 'voting' : 'input';
    updatePhase(window.currentPhase);
    sendWebSocketMessage('phase_change', { phase: window.currentPhase });
}

export function updatePhase(phase) {
    window.currentPhase = phase;
    const phaseLabel = phase === 'input' ? i18n.t('phase.input') : (phase === 'voting' ? i18n.t('phase.voting') : (i18n.t('phase.' + phase) || phase));
    const currentPhaseEl = document.getElementById('currentPhase');
    if (currentPhaseEl) currentPhaseEl.textContent = phaseLabel;

    // Update button text
    const switchBtn = document.getElementById('switchPhaseBtn');
    if (switchBtn) {
        if (phase === 'input') {
            switchBtn.textContent = i18n.t('btn.switch_voting') || 'Switch to Voting';
        } else {
            switchBtn.textContent = i18n.t('btn.switch_input') || 'Switch to Input';
        }
    }

    if (window.currentBoard) {
        loadBoard(window.currentBoard.id);
    }
}

// Timer Sound Notification
export function playTimerSound() {
    try {
        // Create audio context for beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure beep sound (800Hz, 0.3s duration)
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('BenTro Timer', {
                body: 'Time is up!',
                icon: '/static/bentrologo.png'
            });
        }
    } catch (error) {
        console.error('Failed to play timer sound:', error);
    }
}

// Request notification permission
export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Global Shims
window.startTimer = startTimer;
window.startTimerUI = startTimerUI;
window.stopTimer = stopTimer;
window.stopTimerUI = stopTimerUI;
window.updateTimerDisplay = updateTimerDisplay;
window.switchPhase = switchPhase;
window.updatePhase = updatePhase;
window.playTimerSound = playTimerSound;
window.requestNotificationPermission = requestNotificationPermission;

// End of Module
