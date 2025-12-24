// Version information
// This file can be used to set the version on the UI from config
document.addEventListener('DOMContentLoaded', () => {
    if (typeof APP_VERSION !== 'undefined') {
        window.BENTRO_VERSION = APP_VERSION;

        // Update footer version
        const footerVersion = document.getElementById('appVersionFooter');
        if (footerVersion) {
            footerVersion.textContent = APP_VERSION;
        }

        // Update help modal version
        const helpVersion = document.getElementById('appVersion');
        if (helpVersion) {
            helpVersion.textContent = APP_VERSION;
        }
    }
});
