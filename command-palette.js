/**
 * Pandorian Command Palette
 * Quick access to all shortcuts via keyboard
 */

(function() {
    'use strict';

    let shortcuts = [];
    let filteredShortcuts = [];
    let selectedIndex = 0;
    let searchQuery = '';

    const elements = {
        input: null,
        results: null
    };

    /**
     * Initialize command palette
     */
    function init() {
        elements.input = document.getElementById('paletteInput');
        elements.results = document.getElementById('paletteResults');

        if (!elements.input || !elements.results) {
            console.error('[Pandorian] Command palette elements not found');
            return;
        }

        // Check for quick shortcut parameter
        const urlParams = new URLSearchParams(window.location.search);
        const quickKey = urlParams.get('quick');
        
        if (quickKey) {
            // Quick shortcut mode - directly prompt for query
            loadShortcutsForQuick(quickKey);
        } else {
            loadShortcuts();
            attachEventListeners();
        }
    }

    /**
     * Load shortcuts for quick activation
     */
    function loadShortcutsForQuick(shortcutKey) {
        chrome.storage.sync.get(['shortcuts'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to load shortcuts:', chrome.runtime.lastError);
                window.close();
                return;
            }

            const shortcuts = result.shortcuts || [];
            const shortcut = shortcuts.find(s => s.key === shortcutKey);
            
            if (!shortcut) {
                window.close();
                return;
            }

            // Prompt for search query
            const query = prompt(`Enter search query for ${shortcut.name}:`, '');
            
            if (query === null) {
                window.close();
                return;
            }

            const searchQuery = query.trim() || '';
            let finalUrl = shortcut.url;

            if (finalUrl.includes('{q}')) {
                if (searchQuery.length === 0) {
                    finalUrl = finalUrl.replace('{q}', '');
                    finalUrl = finalUrl.replace(/[?&]$/, '').replace(/\?&/, '?');
                } else {
                    finalUrl = finalUrl.replace('{q}', encodeURIComponent(searchQuery));
                }
            } else {
                const separator = finalUrl.includes('?') ? '&' : '?';
                finalUrl = `${finalUrl}${separator}q=${encodeURIComponent(searchQuery)}`;
            }

            // Open in new tab
            chrome.tabs.create({ url: finalUrl }, () => {
                window.close();
            });
        });
    }

    /**
     * Load shortcuts from storage
     */
    function loadShortcuts() {
        chrome.storage.sync.get(['shortcuts', 'keyboardShortcuts'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to load shortcuts:', chrome.runtime.lastError);
                return;
            }

            shortcuts = result.shortcuts || [];
            const keyboardShortcuts = result.keyboardShortcuts || {};

            // Add keyboard shortcut info to shortcuts
            shortcuts = shortcuts.map(s => ({
                ...s,
                keyboardShortcut: keyboardShortcuts[s.key] || null
            }));

            filterShortcuts('');
        });
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        elements.input.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterShortcuts(searchQuery);
        });

        elements.input.addEventListener('keydown', handleKeyDown);

        // Focus input on load
        elements.input.focus();
        elements.input.select();
    }

    /**
     * Filter shortcuts based on search query
     */
    function filterShortcuts(query) {
        if (!query) {
            filteredShortcuts = shortcuts;
        } else {
            filteredShortcuts = shortcuts.filter(s =>
                s.key.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query) ||
                s.url.toLowerCase().includes(query)
            );
        }

        selectedIndex = 0;
        renderResults();
    }

    /**
     * Render results
     */
    function renderResults() {
        if (filteredShortcuts.length === 0) {
            elements.results.innerHTML = `
                <div class="palette-empty">
                    <p>No shortcuts found</p>
                    <p style="font-size: 11px; margin-top: 8px; opacity: 0.7;">Try a different search term</p>
                </div>
            `;
            return;
        }

        elements.results.innerHTML = filteredShortcuts.map((shortcut, index) => {
            const isSelected = index === selectedIndex;
            return `
                <div class="palette-item ${isSelected ? 'selected' : ''}" 
                     data-index="${index}" 
                     data-key="${shortcut.key}"
                     onclick="selectShortcut(${index})">
                    <div class="palette-item-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <div class="palette-item-info">
                        <div class="palette-item-name">${escapeHtml(shortcut.name)}</div>
                        <div class="palette-item-key">@${escapeHtml(shortcut.key)}</div>
                    </div>
                    ${shortcut.keyboardShortcut ? `
                        <div class="palette-item-shortcut">${escapeHtml(shortcut.keyboardShortcut)}</div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Scroll selected item into view
        const selectedElement = elements.results.querySelector('.palette-item.selected');
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * Handle keyboard events
     */
    function handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredShortcuts.length - 1);
                renderResults();
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                renderResults();
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredShortcuts[selectedIndex]) {
                    activateShortcut(filteredShortcuts[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                window.close();
                break;
        }
    }

    /**
     * Select shortcut
     */
    window.selectShortcut = function(index) {
        if (filteredShortcuts[index]) {
            activateShortcut(filteredShortcuts[index]);
        }
    };

    /**
     * Activate shortcut
     */
    function activateShortcut(shortcut) {
        // Prompt for search query
        const query = prompt(`Enter search query for ${shortcut.name}:`, '');
        
        if (query === null) {
            // User cancelled
            return;
        }

        const searchQuery = query.trim() || '';
        let finalUrl = shortcut.url;

        if (finalUrl.includes('{q}')) {
            if (searchQuery.length === 0) {
                finalUrl = finalUrl.replace('{q}', '');
                finalUrl = finalUrl.replace(/[?&]$/, '').replace(/\?&/, '?');
            } else {
                finalUrl = finalUrl.replace('{q}', encodeURIComponent(searchQuery));
            }
        } else {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl = `${finalUrl}${separator}q=${encodeURIComponent(searchQuery)}`;
        }

        // Open in new tab
        chrome.tabs.create({ url: finalUrl }, () => {
            window.close();
        });
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

