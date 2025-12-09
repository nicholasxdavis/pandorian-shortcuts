document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('popupToggle');
    const dot = document.getElementById('statusDot');
    const quickSearch = document.getElementById('quickSearch');
    const recentHistory = document.getElementById('recentHistory');
    const shortcutsCount = document.getElementById('shortcutsCount');
    const totalSearches = document.getElementById('totalSearches');

    // Load initial state
    chrome.runtime.sendMessage({ action: 'getShortcuts' }, (response) => {
        if (response) {
            shortcutsCount.textContent = response.shortcuts?.length || 0;
            const isOn = response.enabled !== false;
            toggle.checked = isOn;
            updateUI(isOn);
        }
    });

    // Load analytics
    chrome.runtime.sendMessage({ action: 'getAnalytics' }, (response) => {
        if (response?.analytics) {
            totalSearches.textContent = response.analytics.totalSearches || 0;
        }
    });

    // Load history
    loadHistory();

    // Toggle handler
    toggle.addEventListener('change', (e) => {
        chrome.storage.sync.set({ enabled: e.target.checked });
        updateUI(e.target.checked);
    });

    // Options button
    document.getElementById('btnOptions').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Command palette button
    document.getElementById('btnCommandPalette').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'openPalette' }).catch(() => {
                alert('Open a webpage first to use the command palette!');
            });
        });
    });

    // Quick search
    let searchTimeout;
    quickSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.toLowerCase();
        
        if (!query) {
            loadHistory();
            return;
        }

        searchTimeout = setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'getShortcuts' }, (response) => {
                if (response?.shortcuts) {
                    const matches = response.shortcuts.filter(s => 
                        s.key.toLowerCase().includes(query) || 
                        s.name.toLowerCase().includes(query) ||
                        query.startsWith('@') && s.key.toLowerCase().includes(query.slice(1))
                    ).slice(0, 5);
                    
                    renderSearchResults(matches);
                }
            });
        }, 200);
    });

    // Handle Enter key in search
    quickSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && quickSearch.value.trim()) {
            const query = quickSearch.value.trim();
            if (query.startsWith('@')) {
                const tag = query.split(' ')[0].slice(1);
                const restQuery = query.split(' ').slice(1).join(' ');
                
                chrome.runtime.sendMessage({ action: 'getShortcuts' }, (response) => {
                    const shortcut = response?.shortcuts?.find(s => s.key === tag);
                    if (shortcut) {
                        const url = shortcut.url.replace('{q}', encodeURIComponent(restQuery || ' '));
                        chrome.tabs.create({ url });
                        window.close();
                    }
                });
            }
        }
    });

    function updateUI(on) {
        if(on) dot.classList.remove('off');
        else dot.classList.add('off');
    }

    function loadHistory() {
        chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
            if (response?.history && response.history.length > 0) {
                recentHistory.innerHTML = response.history.map(item => `
                    <div class="history-item" data-key="${item.key}" data-query="${item.query}">
                        <div>
                            <div style="font-weight:600; font-size:13px; margin-bottom:2px;">
                                <span style="color:var(--accent-glow);">@${item.key}</span> ${item.query}
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);">
                                ${new Date(item.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;">
                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                        </svg>
                    </div>
                `).join('');
                
                // Add click handlers
                recentHistory.querySelectorAll('.history-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const key = item.dataset.key;
                        const query = item.dataset.query;
                        chrome.runtime.sendMessage({ action: 'getShortcuts' }, (response) => {
                            const shortcut = response?.shortcuts?.find(s => s.key === key);
                            if (shortcut) {
                                const url = shortcut.url.replace('{q}', encodeURIComponent(query));
                                chrome.tabs.create({ url });
                                window.close();
                            }
                        });
                    });
                });
            } else {
                recentHistory.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">No recent searches</div>';
            }
        });
    }

    function renderSearchResults(results) {
        if (results.length === 0) {
            recentHistory.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">No matches found</div>';
            return;
        }

        recentHistory.innerHTML = results.map(s => `
            <div class="history-item" data-key="${s.key}">
                <div>
                    <div style="font-weight:600; font-size:13px;">
                        <span style="color:var(--accent-glow);">@${s.key}</span> ${s.name}
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${s.url}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
            </div>
        `).join('');

        recentHistory.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const key = item.dataset.key;
                chrome.runtime.openOptionsPage();
                window.close();
            });
        });
    }
});