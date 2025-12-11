/**
 * Pandorian Content Script
 * Shows pill overlay when @tags are detected in search bars
 */

(function() {
    'use strict';

    let pillOverlay = null;
    let currentInput = null;
    let observer = null;

    /**
     * Create pill overlay element
     */
    function createPillOverlay() {
        if (pillOverlay) return pillOverlay;

        pillOverlay = document.createElement('div');
        pillOverlay.id = 'pandorian-pill';
        pillOverlay.style.cssText = `
            position: fixed;
            background: #000000;
            color: #8b5cf6;
            padding: 8px 14px;
            border-radius: 24px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 13px;
            font-weight: 700;
            z-index: 999999;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1.5px rgba(139, 92, 246, 0.4);
            display: none;
            white-space: nowrap;
            line-height: 1.2;
            transition: opacity 0.15s ease, transform 0.15s ease;
            transform: translateY(-4px);
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(pillOverlay);
        return pillOverlay;
    }

    /**
     * Get color for shortcut key
     */
    function getColorForKey(key) {
        const colors = {
            's': '#1DB954',      // Spotify green
            'g': '#FFFF64',      // Genius yellow
            'r': '#FF4500',      // Reddit orange
            'yt': '#FF0000',     // YouTube red
            'x': '#1DA1F2',      // X blue
            'gh': '#24292e',     // GitHub dark (will use white text)
            'amz': '#FF9900',    // Amazon orange
            'wiki': '#636466',   // Wikipedia gray
            'imdb': '#F5C518'    // IMDb yellow
        };
        return colors[key.toLowerCase()] || '#8b5cf6'; // Default purple
    }

    /**
     * Check if text contains @tag
     */
    function extractTag(text) {
        if (!text) return null;
        
        // Match @ followed by alphanumeric characters
        const match = text.match(/@([a-zA-Z0-9]+)/);
        if (match) {
            return {
                full: match[0],  // @g
                key: match[1]    // g
            };
        }
        return null;
    }

    /**
     * Get shortcut info from background
     */
    function getShortcutInfo(tagKey, callback) {
        chrome.runtime.sendMessage(
            { action: 'getShortcutInfo', key: tagKey },
            (response) => {
                if (chrome.runtime.lastError) {
                    callback(null);
                } else {
                    callback(response);
                }
            }
        );
    }

    /**
     * Position pill relative to input
     */
    function positionPill(input) {
        if (!pillOverlay || !input) return;

        const rect = input.getBoundingClientRect();
        const pillHeight = 36; // Approximate height
        const offset = 12; // Space between input and pill

        // Position above the input, centered horizontally
        const top = rect.top - pillHeight - offset;
        const left = rect.left;

        pillOverlay.style.top = `${Math.max(10, top)}px`; // Don't go above viewport
        pillOverlay.style.left = `${left}px`;
        pillOverlay.style.transform = 'translateY(0)';
    }

    /**
     * Show pill with tag info
     */
    function showPill(input, tag, shortcutInfo) {
        if (!pillOverlay) createPillOverlay();

        const color = getColorForKey(tag.key);
        // Use white text for dark colors, colored text for bright colors
        const textColor = ['gh'].includes(tag.key.toLowerCase()) ? '#ffffff' : color;
        
        // Build pill content - highlight the @tag part
        let content = tag.full;
        if (shortcutInfo && shortcutInfo.name) {
            content = `${tag.full} → ${shortcutInfo.name}`;
        }

        // Create HTML with colored @tag
        pillOverlay.innerHTML = `
            <span style="color: ${color}; font-weight: 800;">${tag.full}</span>
            ${shortcutInfo && shortcutInfo.name ? `<span style="color: ${textColor}; opacity: 0.9; margin-left: 6px;">→ ${shortcutInfo.name}</span>` : ''}
        `;

        pillOverlay.style.color = textColor;
        pillOverlay.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1.5px ${color}60`;
        
        // Black background with subtle gradient
        pillOverlay.style.background = `#000000`;
        pillOverlay.style.border = `1.5px solid ${color}`;
        
        positionPill(input);
        pillOverlay.style.display = 'block';
        pillOverlay.style.opacity = '1';
    }

    /**
     * Hide pill
     */
    function hidePill() {
        if (pillOverlay) {
            pillOverlay.style.opacity = '0';
            pillOverlay.style.transform = 'translateY(-4px)';
            setTimeout(() => {
                if (pillOverlay) {
                    pillOverlay.style.display = 'none';
                }
            }, 150);
        }
    }

    /**
     * Handle input events
     */
    function handleInput(e) {
        const input = e.target;
        const value = input.value || '';
        const tag = extractTag(value);

        currentInput = input;

        if (tag) {
            // Show pill immediately for visual feedback
            showPill(input, tag, null);
            
            // Get shortcut info and update pill
            getShortcutInfo(tag.key, (shortcutInfo) => {
                if (shortcutInfo && currentInput === input) {
                    showPill(input, tag, shortcutInfo);
                }
            });
        } else {
            hidePill();
        }
    }

    /**
     * Handle focus events
     */
    function handleFocus(e) {
        const input = e.target;
        const value = input.value || '';
        const tag = extractTag(value);

        if (tag) {
            getShortcutInfo(tag.key, (shortcutInfo) => {
                if (shortcutInfo) {
                    showPill(input, tag, shortcutInfo);
                }
            });
        }
    }

    /**
     * Handle blur events
     */
    function handleBlur(e) {
        // Delay hiding to allow clicks on pill (though it's pointer-events: none)
        setTimeout(() => {
            hidePill();
        }, 200);
    }

    /**
     * Find search inputs on page
     */
    function findSearchInputs() {
        // Common search input selectors
        const selectors = [
            'input[name="q"]',           // Google, DuckDuckGo
            'input[name="query"]',       // Bing
            'input[name="p"]',           // Yahoo
            'input[type="search"]',       // Generic
            'input[aria-label*="search" i]', // Accessibility
            'input[placeholder*="search" i]', // Placeholder
            '#search',                   // ID
            '#searchbox',                // ID
            '.search-input',             // Class
            'textarea[name="q"]'         // Some sites use textarea
        ];

        const inputs = [];
        const seen = new Set();
        
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                found.forEach(input => {
                    if ((input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') && 
                        !seen.has(input)) {
                        // Check if it's visible and likely a search input
                        const rect = input.getBoundingClientRect();
                        if (rect.width > 100 && rect.height > 20) {
                            inputs.push(input);
                            seen.add(input);
                        }
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });

        return inputs;
    }

    /**
     * Attach listeners to inputs
     */
    function attachListeners() {
        const inputs = findSearchInputs();
        
        inputs.forEach(input => {
            // Remove existing listeners to avoid duplicates
            input.removeEventListener('input', handleInput);
            input.removeEventListener('focus', handleFocus);
            input.removeEventListener('blur', handleBlur);
            
            // Add listeners
            input.addEventListener('input', handleInput, { passive: true });
            input.addEventListener('focus', handleFocus, { passive: true });
            input.addEventListener('blur', handleBlur, { passive: true });
        });
    }

    /**
     * Initialize content script
     */
    function init() {
        // Create pill overlay
        createPillOverlay();

        // Attach listeners to existing inputs
        attachListeners();

        // Watch for dynamically added inputs (SPA navigation)
        observer = new MutationObserver(() => {
            attachListeners();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Handle window resize/scroll to reposition pill
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (currentInput && pillOverlay && pillOverlay.style.display !== 'none') {
                    positionPill(currentInput);
                }
            }, 100);
        }, { passive: true });

        let scrollTimer;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                if (currentInput && pillOverlay && pillOverlay.style.display !== 'none') {
                    positionPill(currentInput);
                }
            }, 50);
        }, { passive: true });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (observer) observer.disconnect();
        if (pillOverlay) pillOverlay.remove();
    });
})();

