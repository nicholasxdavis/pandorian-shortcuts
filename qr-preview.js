/**
 * QR Preview Page Controller
 * Handles QR code generation and display
 */

(function() {
    'use strict';

    const qrCodePreview = document.getElementById('qrCodePreview');
    const qrPreviewUrl = document.getElementById('qrPreviewUrl');
    const closeBtn = document.getElementById('closeQRPreview');

    // Get URL from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get('url') || '';

    if (url) {
        qrPreviewUrl.textContent = url;
        generateQRCode(url);
    } else {
        qrCodePreview.innerHTML = '<p class="qr-loading" style="color: var(--danger);">No URL provided</p>';
    }

    function generateQRCode(url) {
        const encodedUrl = encodeURIComponent(url);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedUrl}&color=ffffff&bgcolor=141414`;
        
        const img = document.createElement('img');
        img.src = qrApiUrl;
        img.alt = 'QR Code';
        
        img.onerror = () => {
            qrCodePreview.innerHTML = '<p class="qr-loading" style="color: var(--danger);">Failed to generate QR code</p>';
        };
        
        img.onload = () => {
            qrCodePreview.innerHTML = '';
            qrCodePreview.appendChild(img);
        };
    }

    function closePreview() {
        window.close();
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closePreview);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePreview();
        }
    });
})();





