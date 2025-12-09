document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('popupToggle');
    const dot = document.getElementById('statusDot');

    chrome.storage.sync.get(['enabled'], (r) => {
        const isOn = r.enabled !== false;
        toggle.checked = isOn;
        updateUI(isOn);
    });

    toggle.addEventListener('change', (e) => {
        chrome.storage.sync.set({ enabled: e.target.checked });
        updateUI(e.target.checked);
    });

    document.getElementById('btnOptions').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    function updateUI(on) {
        if(on) dot.classList.remove('off');
        else dot.classList.add('off');
    }
});