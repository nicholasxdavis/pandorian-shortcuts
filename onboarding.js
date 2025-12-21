/**
 * Pandorian Onboarding System
 * Guides new users through the extension
 */

(function() {
    'use strict';

    const ONBOARDING_STORAGE_KEY = 'pandorian_onboarding_completed';
    const ONBOARDING_VERSION = 1;

    const steps = [
        {
            title: 'Welcome to Pandorian!',
            content: 'Pandorian lets you search any website instantly using @tags in your search bar. No more copying and pasting URLs!',
            target: null,
            position: 'center'
        },
        {
            title: 'How It Works',
            content: 'Type your search query with an @tag in any search engine. For example: <strong>drake @g</strong> searches Genius, <strong>react @gh</strong> searches GitHub.',
            target: null,
            position: 'center'
        },
        {
            title: 'Try It Now',
            content: 'Go to Google, Bing, or DuckDuckGo and type: <strong>test @g</strong> to search Genius. The extension will automatically redirect you!',
            target: null,
            position: 'center'
        },
        {
            title: 'Create Your First Shortcut',
            content: 'Use this form to create custom shortcuts. Enter a trigger (like "g"), a name, and a URL with <code>{q}</code> where your search goes.',
            target: '#addForm',
            position: 'top'
        },
        {
            title: 'Manage Your Shortcuts',
            content: 'All your shortcuts appear here. Use arrow keys to navigate, <kbd>Enter</kbd> to edit, and <kbd>Delete</kbd> to remove.',
            target: '#shortcutsList',
            position: 'top'
        },
        {
            title: 'Search & Organize',
            content: 'Use this search bar to quickly find shortcuts when you have many configured. You can also import/export your shortcuts.',
            target: '#searchInput',
            position: 'bottom'
        },
        {
            title: 'Keyboard Shortcuts',
            content: 'Press <kbd>Ctrl+Q</kbd> (or <kbd>Cmd+Q</kbd> on Mac) to generate QR codes for the current page. You can also assign direct shortcuts (Ctrl+Shift+1-4) to favorites.',
            target: null,
            position: 'center'
        },
        {
            title: 'You\'re All Set!',
            content: 'Start using @tags in your searches! Press <kbd>Esc</kbd> or click "Show Tour" anytime to see this again.',
            target: null,
            position: 'center'
        }
    ];

    let currentStep = 0;
    let overlay = null;
    let tooltip = null;

    /**
     * Check if onboarding should be shown
     */
    function shouldShowOnboarding() {
        return new Promise((resolve) => {
            chrome.storage.local.get([ONBOARDING_STORAGE_KEY], (result) => {
                const completed = result[ONBOARDING_STORAGE_KEY];
                resolve(!completed);
            });
        });
    }

    /**
     * Mark onboarding as completed
     */
    function completeOnboarding() {
        chrome.storage.local.set({
            [ONBOARDING_STORAGE_KEY]: true,
            onboarding_version: ONBOARDING_STORAGE_KEY
        });
    }

    /**
     * Create overlay
     */
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.addEventListener('click', handleOverlayClick);
        document.body.appendChild(overlay);
    }

    /**
     * Create tooltip
     */
    function createTooltip() {
        tooltip = document.createElement('div');
        tooltip.className = 'onboarding-tooltip';
        document.body.appendChild(tooltip);
    }

    /**
     * Show step
     */
    function showStep(stepIndex) {
        if (stepIndex >= steps.length) {
            endOnboarding();
            return;
        }

        const step = steps[stepIndex];
        currentStep = stepIndex;

        // Update tooltip content
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <span class="tooltip-step">${stepIndex + 1} / ${steps.length}</span>
                <button class="tooltip-close" aria-label="Close">×</button>
            </div>
            <div class="tooltip-content">
                <h3>${step.title}</h3>
                <p>${step.content}</p>
            </div>
            <div class="tooltip-footer">
                ${stepIndex > 0 ? '<button class="btn btn-subtle btn-small" id="onboarding-prev">Previous</button>' : ''}
                <button class="btn btn-accent btn-small" id="onboarding-next">
                    ${stepIndex === steps.length - 1 ? 'Get Started' : 'Next'}
                </button>
                <button class="btn btn-text btn-small" id="onboarding-skip">Skip Tour</button>
            </div>
        `;

        // Position tooltip
        positionTooltip(step);

        // Attach event listeners
        attachTooltipListeners();

        // Highlight target element
        if (step.target) {
            highlightTarget(step.target);
        } else {
            removeHighlight();
        }
    }

    /**
     * Position tooltip
     */
    function positionTooltip(step) {
        if (!step.target) {
            // Center tooltip
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.style.maxWidth = '400px';
            return;
        }

        const target = document.querySelector(step.target);
        if (!target) {
            // Fallback to center
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        switch (step.position) {
            case 'top':
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${rect.top - tooltipRect.height - 20}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'bottom':
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${rect.bottom + 20}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'left':
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${rect.top + rect.height / 2}px`;
                tooltip.style.left = `${rect.left - tooltipRect.width - 20}px`;
                tooltip.style.transform = 'translateY(-50%)';
                break;
            case 'right':
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${rect.top + rect.height / 2}px`;
                tooltip.style.left = `${rect.right + 20}px`;
                tooltip.style.transform = 'translateY(-50%)';
                break;
            default:
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${rect.bottom + 20}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
        }

        // Ensure tooltip stays in viewport
        const tooltipRectFinal = tooltip.getBoundingClientRect();
        if (tooltipRectFinal.left < 20) {
            tooltip.style.left = '20px';
            tooltip.style.transform = '';
        }
        if (tooltipRectFinal.right > window.innerWidth - 20) {
            tooltip.style.left = `${window.innerWidth - tooltipRectFinal.width - 20}px`;
            tooltip.style.transform = '';
        }
        if (tooltipRectFinal.top < 20) {
            tooltip.style.top = '20px';
            tooltip.style.transform = '';
        }
    }

    /**
     * Highlight target element
     */
    function highlightTarget(selector) {
        const target = document.querySelector(selector);
        if (target) {
            target.classList.add('onboarding-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Remove highlight
     */
    function removeHighlight() {
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });
    }

    /**
     * Attach tooltip event listeners
     */
    function attachTooltipListeners() {
        const nextBtn = tooltip.querySelector('#onboarding-next');
        const prevBtn = tooltip.querySelector('#onboarding-prev');
        const skipBtn = tooltip.querySelector('#onboarding-skip');
        const closeBtn = tooltip.querySelector('.tooltip-close');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentStep < steps.length - 1) {
                    showStep(currentStep + 1);
                } else {
                    endOnboarding();
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentStep > 0) {
                    showStep(currentStep - 1);
                }
            });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', endOnboarding);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', endOnboarding);
        }

        // Keyboard navigation
        document.addEventListener('keydown', handleOnboardingKeyboard);
    }

    /**
     * Handle keyboard events during onboarding
     */
    function handleOnboardingKeyboard(e) {
        if (!tooltip || !tooltip.parentElement) return;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                endOnboarding();
                break;
            case 'ArrowRight':
            case 'Enter':
                e.preventDefault();
                if (currentStep < steps.length - 1) {
                    showStep(currentStep + 1);
                } else {
                    endOnboarding();
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (currentStep > 0) {
                    showStep(currentStep - 1);
                }
                break;
        }
    }

    /**
     * Handle overlay click
     */
    function handleOverlayClick(e) {
        // Only advance if clicking overlay, not tooltip
        if (e.target === overlay) {
            if (currentStep < steps.length - 1) {
                showStep(currentStep + 1);
            } else {
                endOnboarding();
            }
        }
    }

    /**
     * End onboarding
     */
    function endOnboarding() {
        removeHighlight();
        if (overlay) overlay.remove();
        if (tooltip) tooltip.remove();
        completeOnboarding();
        document.removeEventListener('keydown', handleOnboardingKeyboard);
    }

    /**
     * Start onboarding
     */
    function startOnboarding() {
        // Clean up any existing onboarding
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
        
        // Reset to first step
        currentStep = 0;
        createOverlay();
        createTooltip();
        showStep(0);
    }

    /**
     * Initialize onboarding
     */
    function init() {
        // Only show on options page
        if (!document.querySelector('.container')) return;

        shouldShowOnboarding().then(show => {
            if (show) {
                // Wait for page to be fully loaded
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        setTimeout(startOnboarding, 500);
                    });
                } else {
                    setTimeout(startOnboarding, 500);
                }
            }
        });
    }

    // Make startOnboarding available globally for show tour button
    window.startOnboarding = startOnboarding;

    // Initialize
    init();
})();

