// Timer Utility (Sound & Notifications)
// Logic moved to BoardController.js

export function playTimerSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

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

export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Global Shims for Legacy (if any valid ones remain, otherwise clean aliases)
window.playTimerSound = playTimerSound;
window.requestNotificationPermission = requestNotificationPermission;

