document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    document.getElementById('addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addShortcut();
    });
    
    document.getElementById('globalToggle').addEventListener('change', (e) => {
        chrome.storage.sync.set({ enabled: e.target.checked });
    });
});

function loadData() {
    chrome.storage.sync.get(['shortcuts', 'enabled'], (result) => {
        document.getElementById('globalToggle').checked = result.enabled !== false;
        renderList(result.shortcuts || []);
    });
}

function renderList(shortcuts) {
    const list = document.getElementById('shortcutsList');
    list.innerHTML = '';
    document.getElementById('countBadge').textContent = shortcuts.length;

    if (shortcuts.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No shortcuts found. Add one above.</div>`;
        return;
    }

    shortcuts.forEach((s, idx) => {
        const div = document.createElement('div');
        div.className = 'shortcut-item';
        div.innerHTML = `
            <div class="tag-badge">@${escape(s.key)}</div>
            <div class="item-info">
                <span class="item-name">${escape(s.name)}</span>
                <span class="item-url">${escape(s.url)}</span>
            </div>
            <button class="btn btn-danger" onclick="removeShortcut(${idx})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        list.appendChild(div);
    });
}

// Global scope for onclick
window.removeShortcut = (idx) => {
    if(!confirm("Delete this shortcut?")) return;
    chrome.storage.sync.get(['shortcuts'], (r) => {
        const s = r.shortcuts || [];
        s.splice(idx, 1);
        chrome.storage.sync.set({ shortcuts: s }, loadData);
    });
};

function addShortcut() {
    const key = document.getElementById('newKey').value.trim().replace('@', '');
    const name = document.getElementById('newName').value.trim();
    const url = document.getElementById('newUrl').value.trim();

    if (!url.includes('{q}')) {
        alert("URL must contain {q} for the search query.");
        return;
    }

    chrome.storage.sync.get(['shortcuts'], (r) => {
        const s = r.shortcuts || [];
        if (s.find(x => x.key === key)) {
            alert("Shortcut @" + key + " already exists.");
            return;
        }
        s.push({ key, name, url });
        chrome.storage.sync.set({ shortcuts: s }, () => {
            document.getElementById('addForm').reset();
            loadData();
        });
    });
}

function escape(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}