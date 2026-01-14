import { CONFIG } from './config.js';

// --- Logger Shim ---
(function () {
    const originalLog = console.log;
    // Check Config AND LocalStorage
    const isDebug = CONFIG.DEBUG_MODE || localStorage.getItem('DEBUG') === 'true';

    if (!isDebug) {
        console.log = function () { }; // Silence standard logs
        // console.info = function() {}; // Optional: Silence info too if needed
    } else {
        originalLog.call(console, '%c [DEBUG] Logger Active', 'background: #222; color: #bada55');
    }
})();
