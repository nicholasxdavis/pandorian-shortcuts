document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    loadAnalytics();
});

let allShortcuts = [];
let currentFilter = 'all';
let currentSearch = '';

function setupEventListeners() {
    document.getElementById('addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addShortcut();
    });
    
    document.getElementById('globalToggle').addEventListener('change', (e) => {
        chrome.storage.sync.set({ enabled: e.target.checked });
    });

    // Filter input
    document.getElementById('filterInput').addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderList(allShortcuts);
    });

    // Category filters
    document.querySelectorAll('.filter-category').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-category').forEach(b => b.style.background = '');
            btn.style.background = 'var(--accent-primary)';
            currentFilter = btn.dataset.category;
            renderList(allShortcuts);
        });
    });

    // Export
    document.getElementById('btnExport').addEventListener('click', exportShortcuts);

    // Import
    document.getElementById('btnImport').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importShortcuts);
}

function loadData() {
    chrome.runtime.sendMessage({ action: 'getShortcuts' }, (response) => {
        if (response) {
            allShortcuts = response.shortcuts || [];
            document.getElementById('globalToggle').checked = response.enabled !== false;
            document.getElementById('statShortcuts').textContent = allShortcuts.length;
            renderList(allShortcuts);
        } else {
            chrome.storage.sync.get(['shortcuts', 'enabled'], (result) => {
                allShortcuts = result.shortcuts || [];
                document.getElementById('globalToggle').checked = result.enabled !== false;
                document.getElementById('statShortcuts').textContent = allShortcuts.length;
                renderList(allShortcuts);
            });
        }
    });
}

function loadAnalytics() {
    chrome.runtime.sendMessage({ action: 'getAnalytics' }, (response) => {
        if (response?.analytics) {
            const a = response.analytics;
            document.getElementById('statTotalSearches').textContent = a.totalSearches || 0;
            
            // Find most used
            const shortcuts = Object.keys(a.shortcutsUsed || {});
            if (shortcuts.length > 0) {
                const mostUsed = shortcuts.reduce((a, b) => 
                    (a.shortcutsUsed?.[a] || 0) > (a.shortcutsUsed?.[b] || 0) ? a : b
                );
                document.getElementById('statMostUsed').textContent = '@' + mostUsed;
            }
        }
    });
}

function renderList(shortcuts) {
    const list = document.getElementById('shortcutsList');
    list.innerHTML = '';

    // Apply filters
    let filtered = shortcuts;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(s => (s.category || 'General') === currentFilter);
    }
    
    if (currentSearch) {
        filtered = filtered.filter(s => 
            s.key.toLowerCase().includes(currentSearch) ||
            s.name.toLowerCase().includes(currentSearch) ||
            s.url.toLowerCase().includes(currentSearch)
        );
    }

    document.getElementById('countBadge').textContent = filtered.length;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div style="font-size:14px; margin-bottom:8px;">No shortcuts found</div>
                <div style="font-size:12px; color:var(--text-muted);">${shortcuts.length === 0 ? 'Create your first shortcut above!' : 'Try adjusting your filters.'}</div>
            </div>
        `;
        return;
    }

    filtered.forEach((s, idx) => {
        const originalIdx = allShortcuts.indexOf(s);
        const div = document.createElement('div');
        div.className = 'shortcut-item';
        div.innerHTML = `
            <div class="tag-badge">${escape(s.icon || '')} @${escape(s.key)}</div>
            <div class="item-info">
                <span class="item-name">
                    ${escape(s.name)}
                    ${s.category ? `<span class="category-badge">${escape(s.category)}</span>` : ''}
                </span>
                <span class="item-url">${escape(s.url)}</span>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="btn btn-danger btn-sm" onclick="removeShortcut(${originalIdx})" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.removeShortcut = (idx) => {
    if(!confirm("Delete this shortcut?")) return;
    chrome.storage.sync.get(['shortcuts'], (r) => {
        const s = r.shortcuts || [];
        s.splice(idx, 1);
        chrome.storage.sync.set({ shortcuts: s }, () => {
            loadData();
            loadAnalytics();
        });
    });
};

function addShortcut() {
    const key = document.getElementById('newKey').value.trim().replace('@', '').toLowerCase();
    const name = document.getElementById('newName').value.trim();
    const url = document.getElementById('newUrl').value.trim();
    const category = document.getElementById('newCategory').value;
    const icon = document.getElementById('newIcon').value.trim();

    if (!key) {
        alert("Please enter a trigger key.");
        return;
    }

    if (!url.includes('{q}')) {
        alert("URL must contain {q} for the search query.");
        return;
    }

    chrome.storage.sync.get(['shortcuts'], (r) => {
        const s = r.shortcuts || [];
        if (s.find(x => x.key.toLowerCase() === key.toLowerCase())) {
            alert("Shortcut @" + key + " already exists.");
            return;
        }
        s.push({ key, name, url, category: category || 'General', icon: icon || null });
        chrome.storage.sync.set({ shortcuts: s }, () => {
            document.getElementById('addForm').reset();
            document.getElementById('newCategory').value = 'General';
            loadData();
        });
    });
}

function exportShortcuts() {
    chrome.storage.sync.get(['shortcuts'], (r) => {
        const data = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            shortcuts: r.shortcuts || []
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pandorian-shortcuts-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

function importShortcuts(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            const shortcuts = data.shortcuts || data; // Support both formats
            
            if (!Array.isArray(shortcuts)) {
                throw new Error('Invalid format');
            }

            if (!confirm(`Import ${shortcuts.length} shortcut(s)? This will add them to your existing shortcuts.`)) {
                return;
            }

            chrome.storage.sync.get(['shortcuts'], (r) => {
                const existing = r.shortcuts || [];
                const merged = [...existing];
                
                shortcuts.forEach(shortcut => {
                    if (!merged.find(s => s.key === shortcut.key)) {
                        merged.push({
                            key: shortcut.key,
                            name: shortcut.name || shortcut.key,
                            url: shortcut.url,
                            category: shortcut.category || 'General',
                            icon: shortcut.icon || null
                        });
                    }
                });

                chrome.storage.sync.set({ shortcuts: merged }, () => {
                    alert(`Imported ${shortcuts.length} shortcut(s)!`);
                    loadData();
                    e.target.value = ''; // Reset file input
                });
            });
        } catch (error) {
            alert('Error importing shortcuts. Please check the file format.');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

function escape(s) {
    if (!s) return '';
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}