// Timer and Phase Management

function startTimer() {
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 5;
    window.timerSeconds = minutes * 60;

    sendWebSocketMessage('timer_start', { seconds: window.timerSeconds });
    startTimerUI(window.timerSeconds);
}

function startTimerUI(seconds) {
    window.timerSeconds = seconds;
    document.getElementById('startTimerBtn').style.display = 'none';
    document.getElementById('stopTimerBtn').style.display = 'inline-block';

    if (window.timerInterval) clearInterval(window.timerInterval);

    window.timerInterval = setInterval(() => {
        window.timerSeconds--;
        updateTimerDisplay(window.timerSeconds);
        sendWebSocketMessage('timer_update', { seconds: window.timerSeconds });

        if (window.timerSeconds <= 0) {
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

    document.getElementById('startTimerBtn').style.display = 'inline-block';
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
    const phaseLabel = phase === 'input' ? 'Input Phase' : 'Voting Phase';
    document.getElementById('currentPhase').textContent = phaseLabel;
    document.getElementById('switchPhaseBtn').textContent =
        phase === 'input' ? 'Switch to Voting' : 'Switch to Input';

    if (window.currentBoard) {
        loadBoard(window.currentBoard.id);
    }
}
