// Timer and Phase Management

function startTimer() {
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 5;
    window.timerSeconds = minutes * 60;

    sendWebSocketMessage('timer_start', { seconds: window.timerSeconds });
    startTimerUI(window.timerSeconds);
}

function startTimerUI(seconds) {
    window.timerSeconds = seconds;

    const isManager = typeof isBoardManager === 'function' && isBoardManager();
    document.getElementById('startTimerBtn').style.display = 'none';
    document.getElementById('stopTimerBtn').style.display = isManager ? 'inline-block' : 'none';

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

function stopTimer() {
    sendWebSocketMessage('timer_stop', {});
    stopTimerUI();
}

function stopTimerUI() {
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
        window.timerInterval = null;
    }

    const isManager = typeof isBoardManager === 'function' && isBoardManager();
    document.getElementById('startTimerBtn').style.display = isManager ? 'inline-block' : 'none';
    document.getElementById('stopTimerBtn').style.display = 'none';
    window.timerSeconds = 0;
    updateTimerDisplay(0);
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timerDisplay').textContent =
        `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function switchPhase() {
    window.currentPhase = window.currentPhase === 'input' ? 'voting' : 'input';
    updatePhase(window.currentPhase);
    sendWebSocketMessage('phase_change', { phase: window.currentPhase });
}

function updatePhase(phase) {
    window.currentPhase = phase;
    const phaseLabel = phase === 'input' ? i18n.t('phase.input') : (phase === 'voting' ? i18n.t('phase.voting') : (i18n.t('phase.' + phase) || phase));
    document.getElementById('currentPhase').textContent = phaseLabel;

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
function playTimerSound() {
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
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}
