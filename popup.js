/**
 * Pandorian Popup Controller
 * Handles popup UI interactions and state
 */

(function() {
    'use strict';

    const elements = {
        toggle: null,
        dot: null,
        btnOptions: null,
        btnHeaderOptions: null,
        btnQRCode: null,
        statusText: null,
        shortcutsCount: null,
        qrModal: null,
        qrModalClose: null,
        qrCodeContainer: null,
        qrModalUrl: null
    };

    /**
     * Initialize popup
     */
    function init() {
        try {
            elements.toggle = document.getElementById('popupToggle');
            elements.dot = document.getElementById('statusDot');
            elements.btnOptions = document.getElementById('btnOptions');
            elements.btnHeaderOptions = document.getElementById('btnHeaderOptions');
            elements.btnQRCode = document.getElementById('btnQRCode');
            elements.statusText = document.getElementById('statusText');
            elements.shortcutsCount = document.getElementById('shortcutsCount');
            elements.qrModal = document.getElementById('qrModal');
            elements.qrModalClose = document.getElementById('qrModalClose');
            elements.qrCodeContainer = document.getElementById('qrCodeContainer');
            elements.qrModalUrl = document.getElementById('qrModalUrl');

            if (!elements.toggle || !elements.dot || !elements.btnOptions || !elements.btnQRCode) {
                console.error('[Pandorian] Missing required elements');
                return;
            }

            loadState();
            attachEventListeners();
        } catch (error) {
            console.error('[Pandorian] Initialization error:', error);
        }
    }

    /**
     * Load extension state
     */
    function loadState() {
        chrome.storage.sync.get(['enabled', 'shortcuts'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to load state:', chrome.runtime.lastError);
                return;
            }

            const isEnabled = result.enabled !== false;
            elements.toggle.checked = isEnabled;
            updateUI(isEnabled);

            // Show shortcuts count
            const shortcuts = result.shortcuts || [];
            if (elements.shortcutsCount) {
                elements.shortcutsCount.textContent = shortcuts.length;
            }
        });
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        elements.toggle.addEventListener('change', handleToggleChange);
        elements.btnOptions.addEventListener('click', handleOptionsClick);
        if (elements.btnHeaderOptions) {
            elements.btnHeaderOptions.addEventListener('click', handleOptionsClick);
        }
        elements.btnQRCode.addEventListener('click', handleQRCodeClick);
        
        if (elements.qrModalClose) {
            elements.qrModalClose.addEventListener('click', closeQRModal);
        }
        
        if (elements.qrModal) {
            elements.qrModal.addEventListener('click', (e) => {
                if (e.target === elements.qrModal) {
                    closeQRModal();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't interfere with input fields
            if (e.target.tagName === 'INPUT') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOptionsClick();
                }
                return;
            }

            // Global shortcuts
            switch (e.key) {
                case 'Enter':
                    if (document.activeElement === elements.toggle) {
                        elements.toggle.click();
                    } else {
                        handleOptionsClick();
                    }
                    break;
                case 'o':
                case 'O':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleOptionsClick();
                    }
                    break;
                case 'Escape':
                    if (elements.qrModal && elements.qrModal.style.display === 'flex') {
                        closeQRModal();
                    } else {
                        window.close();
                    }
                    break;
            }
        });

        // Make toggle keyboard accessible
        elements.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elements.toggle.click();
            }
        });
    }

    /**
     * Handle toggle change
     */
    function handleToggleChange(e) {
        const isEnabled = e.target.checked;
        
        chrome.storage.sync.set({ enabled: isEnabled }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to save state:', chrome.runtime.lastError);
                // Revert toggle on error
                elements.toggle.checked = !isEnabled;
                showToast('Failed to save settings', 'error');
                return;
            }

            updateUI(isEnabled);
            showToast(isEnabled ? 'Extension enabled' : 'Extension disabled', 'success');
        });
    }

    /**
     * Handle options button click
     */
    function handleOptionsClick() {
        chrome.runtime.openOptionsPage();
        window.close();
    }

    /**
     * Handle QR code button click
     */
    function handleQRCodeClick() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].url) {
                showToast('Unable to get current page URL', 'error');
                return;
            }

            const url = tabs[0].url;
            generateQRCode(url);
        });
    }

    /**
     * Generate QR code for URL
     */
    function generateQRCode(url) {
        if (!elements.qrModal || !elements.qrCodeContainer) {
            showToast('QR code modal not available', 'error');
            return;
        }

        // Show modal
        elements.qrModal.style.display = 'flex';
        
        // Display URL
        if (elements.qrModalUrl) {
            elements.qrModalUrl.textContent = url;
        }

        // Clear previous QR code
        elements.qrCodeContainer.innerHTML = '';

        // Generate QR code via API
        generateQRCodeViaAPI(url);
    }

    /**
     * Generate QR code via API
     */
    function generateQRCodeViaAPI(url) {
        const encodedUrl = encodeURIComponent(url);
        // Generate white QR code on dark background
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedUrl}&color=ffffff&bgcolor=141414`;
        
        // Show loading placeholder
        elements.qrCodeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; margin: 0;">Generating QR code...</p>';
        
        const img = document.createElement('img');
        img.src = qrApiUrl;
        img.alt = 'QR Code';
        img.style.width = '256px';
        img.style.height = '256px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        img.onerror = () => {
            showToast('Failed to generate QR code', 'error');
            elements.qrCodeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; margin: 0;">Failed to load QR code. Please try again.</p>';
        };
        
        img.onload = () => {
            // Clear placeholder and show QR code
            elements.qrCodeContainer.innerHTML = '';
            elements.qrCodeContainer.appendChild(img);
        };
    }

    /**
     * Close QR modal
     */
    function closeQRModal() {
        if (elements.qrModal) {
            elements.qrModal.style.display = 'none';
            elements.qrCodeContainer.innerHTML = '';
        }
    }

    /**
     * Update UI based on state
     */
    function updateUI(isEnabled) {
        if (isEnabled) {
            elements.dot.classList.remove('off');
            if (elements.statusText) {
                elements.statusText.textContent = 'Enabled';
                elements.statusText.className = 'status-text active';
            }
        } else {
            elements.dot.classList.add('off');
            if (elements.statusText) {
                elements.statusText.textContent = 'Disabled';
                elements.statusText.className = 'status-text disabled';
            }
        }
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();