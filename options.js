/**
 * Pandorian Options Page Controller
 * Advanced shortcut management with edit, import/export, search, and more
 */

(function() {
    'use strict';

    const state = {
        shortcuts: [],
        filteredShortcuts: [],
        editingIndex: -1,
        searchQuery: '',
        keyboardShortcuts: {} // Maps shortcut key to command (e.g., { 'g': 'quick-shortcut-1' })
    };

    const elements = {
        addForm: null,
        newKey: null,
        newName: null,
        newUrl: null,
        shortcutsList: null,
        countBadge: null,
        globalToggle: null,
        searchInput: null,
        exportBtn: null,
        importBtn: null,
        importInput: null,
        clearBtn: null,
        bookmarksList: null,
        bookmarksCountBadge: null,
        bookmarkSearchInput: null,
        addBookmarkBtn: null
    };

    /**
     * Initialize options page
     */
    function init() {
        try {
            initializeElements();
            attachEventListeners();
            attachBookmarkSettingsListeners();
            loadData();
            loadBookmarkSidebarSetting();
        } catch (error) {
            console.error('[Pandorian] Initialization error:', error);
            showToast('Failed to initialize', 'error');
        }
    }

    /**
     * Initialize DOM elements
     */
    function initializeElements() {
        elements.addForm = document.getElementById('addForm');
        elements.newKey = document.getElementById('newKey');
        elements.newName = document.getElementById('newName');
        elements.newUrl = document.getElementById('newUrl');
        elements.shortcutsList = document.getElementById('shortcutsList');
        elements.countBadge = document.getElementById('countBadge');
        elements.globalToggle = document.getElementById('globalToggle');
        elements.searchInput = document.getElementById('searchInput');
        elements.exportBtn = document.getElementById('exportBtn');
        elements.importBtn = document.getElementById('importBtn');
        elements.importInput = document.getElementById('importInput');
        elements.clearBtn = document.getElementById('clearBtn');
        elements.bookmarksSidebarToggle = document.getElementById('bookmarksSidebarToggle');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        elements.addForm.addEventListener('submit', handleAddShortcut);
        elements.globalToggle.addEventListener('change', handleToggleChange);
        
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', handleExport);
        }
        
        if (elements.importBtn) {
            elements.importBtn.addEventListener('click', () => elements.importInput?.click());
        }
        
        if (elements.importInput) {
            elements.importInput.addEventListener('change', handleImport);
        }
        
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', handleClearAll);
        }

        // Bookmark sidebar toggle
        if (elements.bookmarksSidebarToggle) {
            elements.bookmarksSidebarToggle.addEventListener('change', handleBookmarksSidebarToggle);
        }

        // Show tour button
        const showTourBtn = document.getElementById('showTourBtn');
        if (showTourBtn) {
            showTourBtn.addEventListener('click', () => {
                // Clear onboarding completion flag
                chrome.storage.local.remove(['pandorian_onboarding_completed'], () => {
                    // Reload page to trigger onboarding
                    window.location.reload();
                });
            });
        }

        // Form keyboard navigation
        if (elements.newKey) {
            elements.newKey.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    elements.newName.focus();
                }
            });
        }

        if (elements.newName) {
            elements.newName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    elements.newUrl.focus();
                }
            });
        }

        if (elements.newUrl) {
            elements.newUrl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    elements.addForm.dispatchEvent(new Event('submit'));
                }
            });
        }

        // Comprehensive keyboard shortcuts
        document.addEventListener('keydown', handleGlobalKeyboard);
        
        // Delegate events for dynamically created items
        if (elements.shortcutsList) {
            elements.shortcutsList.addEventListener('keydown', handleShortcutItemKeyboard);
            elements.shortcutsList.addEventListener('click', handleShortcutItemClick);
        }
    }

    /**
     * Handle global keyboard shortcuts
     */
    function handleGlobalKeyboard(e) {
        // Don't interfere with input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Allow Escape to cancel editing
            if (e.key === 'Escape' && state.editingIndex !== -1) {
                e.preventDefault();
                cancelEdit();
                return;
            }
            // Allow Ctrl+Enter to submit form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && e.target.closest('#addForm')) {
                elements.addForm.dispatchEvent(new Event('submit'));
                return;
            }
            return;
        }

        // Global shortcuts
        switch (e.key) {
            case 'Escape':
                if (state.editingIndex !== -1) {
                    e.preventDefault();
                    cancelEdit();
                }
                break;
            case 'f':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.searchInput?.focus();
                }
                break;
            case 'n':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.newKey?.focus();
                }
                break;
            case 'e':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.exportBtn?.click();
                }
                break;
            case 'i':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.importBtn?.click();
                }
                break;
            case 'ArrowDown':
                if (!e.target.closest('.shortcut-item')) {
                    e.preventDefault();
                    focusFirstShortcut();
                }
                break;
        }
    }

    /**
     * Handle keyboard events on shortcut items
     */
    function handleShortcutItemKeyboard(e) {
        const item = e.target.closest('.shortcut-item');
        if (!item) return;

        const index = parseInt(item.getAttribute('data-index'));
        if (isNaN(index)) return;

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (state.editingIndex === -1) {
                    editShortcut(index);
                } else if (state.editingIndex === index) {
                    saveEdit(index);
                }
                break;
            case 'Delete':
            case 'Backspace':
                if (state.editingIndex === -1) {
                    e.preventDefault();
                    removeShortcut(index);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                focusNextShortcut(item);
                break;
            case 'ArrowUp':
                e.preventDefault();
                focusPreviousShortcut(item);
                break;
            case 'Home':
                e.preventDefault();
                focusFirstShortcut();
                break;
            case 'End':
                e.preventDefault();
                focusLastShortcut();
                break;
            case 'e':
                if (!e.ctrlKey && !e.metaKey && state.editingIndex === -1) {
                    e.preventDefault();
                    editShortcut(index);
                }
                break;
        }
    }

    /**
     * Handle click events on shortcut items (for button clicks)
     */
    function handleShortcutItemClick(e) {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.getAttribute('data-action');
        const index = parseInt(button.getAttribute('data-index'));
        
        if (isNaN(index)) return;

        switch (action) {
            case 'edit':
                editShortcut(index);
                break;
            case 'delete':
                removeShortcut(index);
                break;
        }
    }

    /**
     * Focus management for shortcuts list
     */
    function focusFirstShortcut() {
        const firstItem = elements.shortcutsList?.querySelector('.shortcut-item[tabindex="0"]');
        if (firstItem) {
            firstItem.focus();
        }
    }

    function focusLastShortcut() {
        const items = elements.shortcutsList?.querySelectorAll('.shortcut-item[tabindex="0"]');
        if (items && items.length > 0) {
            items[items.length - 1].focus();
        }
    }

    function focusNextShortcut(currentItem) {
        const items = Array.from(elements.shortcutsList?.querySelectorAll('.shortcut-item[tabindex="0"]') || []);
        const currentIndex = items.indexOf(currentItem);
        if (currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
        }
    }

    function focusPreviousShortcut(currentItem) {
        const items = Array.from(elements.shortcutsList?.querySelectorAll('.shortcut-item[tabindex="0"]') || []);
        const currentIndex = items.indexOf(currentItem);
        if (currentIndex > 0) {
            items[currentIndex - 1].focus();
        } else {
            // Focus search or form when at top
            elements.searchInput?.focus();
        }
    }

    /**
     * Load data from storage
     */
    function loadData() {
        chrome.storage.sync.get(['shortcuts', 'enabled', 'keyboardShortcuts'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to load data:', chrome.runtime.lastError);
                showToast('Failed to load shortcuts', 'error');
                return;
            }

            state.shortcuts = result.shortcuts || [];
            state.filteredShortcuts = state.shortcuts;
            state.keyboardShortcuts = result.keyboardShortcuts || {};
            elements.globalToggle.checked = result.enabled !== false;
            
            renderList();
        });
    }

    /**
     * Render shortcuts list
     */
    function renderList() {
        const list = elements.shortcutsList;
        if (!list) return;

        list.innerHTML = '';
        
        const shortcutsToRender = state.searchQuery ? state.filteredShortcuts : state.shortcuts;
        elements.countBadge.textContent = shortcutsToRender.length;

        if (shortcutsToRender.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = state.searchQuery 
                ? '<p>No shortcuts match your search.</p>'
                : '<p>No shortcuts found. Add one above to get started.</p><p class="empty-hint">Try: @g for Genius, @yt for YouTube</p>';
            list.appendChild(emptyState);
            return;
        }

        shortcutsToRender.forEach((shortcut, idx) => {
            const originalIndex = state.shortcuts.indexOf(shortcut);
            const item = createShortcutItem(shortcut, originalIndex);
            list.appendChild(item);
        });
    }

    /**
     * Create shortcut item element
     */
    function createShortcutItem(shortcut, index) {
        const div = document.createElement('div');
        div.className = 'shortcut-item';
        div.setAttribute('data-index', index);

        const isEditing = state.editingIndex === index;

        if (isEditing) {
            div.innerHTML = `
                <div class="tag-badge">@${escape(shortcut.key)}</div>
                <div class="item-info item-edit">
                    <input type="text" class="edit-input" id="editName-${index}" value="${escape(shortcut.name)}" placeholder="Name" tabindex="0">
                    <input type="url" class="edit-input" id="editUrl-${index}" value="${escape(shortcut.url)}" placeholder="URL with {q}" tabindex="0">
                </div>
                <div class="item-actions">
                    <button class="btn btn-success btn-icon" onclick="saveEdit(${index})" title="Save (Enter)" tabindex="0" data-action="save" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="cancelEdit()" title="Cancel (Esc)" tabindex="0" data-action="cancel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            // Add keyboard handlers for edit mode
            setTimeout(() => {
                const nameInput = document.getElementById(`editName-${index}`);
                const urlInput = document.getElementById(`editUrl-${index}`);
                const saveBtn = div.querySelector('[data-action="save"]');
                const cancelBtn = div.querySelector('[data-action="cancel"]');

                if (nameInput) {
                    nameInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            urlInput?.focus();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                        }
                    });
                }

                if (urlInput) {
                    urlInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit(index);
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                        } else if (e.key === 'Tab' && e.shiftKey && e.target === urlInput) {
                            // Allow normal tab behavior
                        }
                    });
                }

                if (saveBtn) {
                    saveBtn.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            saveEdit(index);
                        }
                    });
                }

                if (cancelBtn) {
                    cancelBtn.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                        }
                    });
                }

                // Focus first input
                nameInput?.focus();
            }, 10);
        } else {
            const keyboardShortcut = state.keyboardShortcuts[shortcut.key];
            const shortcutLabel = keyboardShortcut ? getShortcutLabel(keyboardShortcut) : null;
            
            div.innerHTML = `
                <div class="tag-badge">@${escape(shortcut.key)}</div>
                <div class="item-info">
                    <span class="item-name">${escape(shortcut.name)}</span>
                    <span class="item-url">${escape(shortcut.url)}</span>
                </div>
                <div class="item-keyboard-shortcut">
                    ${shortcutLabel ? `
                        <span class="keyboard-shortcut-badge" title="Keyboard shortcut: ${shortcutLabel}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            ${escape(shortcutLabel)}
                        </span>
                    ` : `
                        <button class="btn btn-text btn-tiny" onclick="assignKeyboardShortcut(${index})" title="Assign keyboard shortcut">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            Assign
                        </button>
                    `}
                </div>
                <div class="item-actions">
                    <button class="btn btn-accent btn-icon" onclick="editShortcut(${index})" title="Edit (Enter)" tabindex="0" data-action="edit" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="removeShortcut(${index})" title="Delete (Del)" tabindex="0" data-action="delete" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            // Make item focusable for keyboard navigation
            div.setAttribute('tabindex', '0');
            div.setAttribute('role', 'listitem');
            div.setAttribute('aria-label', `Shortcut @${shortcut.key}: ${shortcut.name}`);
        }

        return div;
    }

    /**
     * Handle add shortcut form submission
     */
    function handleAddShortcut(e) {
        e.preventDefault();

        const key = elements.newKey.value.trim().replace(/^@/, '').toLowerCase();
        const name = elements.newName.value.trim();
        const url = elements.newUrl.value.trim();

        // Validation
        if (!key) {
            showToast('Trigger key is required', 'error');
            elements.newKey.focus();
            return;
        }

        if (!name) {
            showToast('Name is required', 'error');
            elements.newName.focus();
            return;
        }

        if (!url) {
            showToast('URL is required', 'error');
            elements.newUrl.focus();
            return;
        }

        if (!isValidUrl(url) && !url.includes('{q}')) {
            showToast('URL must contain {q} placeholder or be a valid URL', 'error');
            elements.newUrl.focus();
            return;
        }

        // Check for duplicates
        if (state.shortcuts.some(s => s.key.toLowerCase() === key)) {
            showToast(`Shortcut @${key} already exists`, 'error');
            elements.newKey.focus();
            return;
        }

        // Add shortcut
        const newShortcut = { key, name, url };
        state.shortcuts.push(newShortcut);

        saveShortcuts(() => {
            elements.addForm.reset();
            renderList();
            showToast(`Shortcut @${key} added`, 'success');
        });
    }

    /**
     * Handle toggle change
     */
    function handleToggleChange(e) {
        chrome.storage.sync.set({ enabled: e.target.checked }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to save toggle:', chrome.runtime.lastError);
                elements.globalToggle.checked = !e.target.checked;
                showToast('Failed to save settings', 'error');
            } else {
                showToast(e.target.checked ? 'Extension enabled' : 'Extension disabled', 'success');
            }
        });
    }

    /**
     * Handle search input
     */
    function handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        state.searchQuery = query;

        if (!query) {
            state.filteredShortcuts = state.shortcuts;
        } else {
            state.filteredShortcuts = state.shortcuts.filter(s => 
                s.key.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query) ||
                s.url.toLowerCase().includes(query)
            );
        }

        renderList();
    }

    /**
     * Handle export
     */
    function handleExport() {
        try {
            const dataStr = JSON.stringify(state.shortcuts, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pandorian-shortcuts-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Shortcuts exported', 'success');
        } catch (error) {
            console.error('[Pandorian] Export error:', error);
            showToast('Failed to export', 'error');
        }
    }

    /**
     * Handle import
     */
    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                
                if (!Array.isArray(imported)) {
                    throw new Error('Invalid format');
                }

                // Validate imported shortcuts
                const valid = imported.filter(s => 
                    s.key && s.name && s.url && 
                    (s.url.includes('{q}') || isValidUrl(s.url))
                );

                if (valid.length === 0) {
                    showToast('No valid shortcuts found in file', 'error');
                    return;
                }

                // Merge with existing (avoid duplicates)
                const existingKeys = new Set(state.shortcuts.map(s => s.key.toLowerCase()));
                const newShortcuts = valid.filter(s => !existingKeys.has(s.key.toLowerCase()));
                const duplicates = valid.length - newShortcuts.length;

                state.shortcuts = [...state.shortcuts, ...newShortcuts];

                saveShortcuts(() => {
                    let message = `Imported ${newShortcuts.length} shortcut(s)`;
                    if (duplicates > 0) {
                        message += ` (${duplicates} duplicate(s) skipped)`;
                    }
                    showToast(message, 'success');
                    elements.importInput.value = '';
                });
            } catch (error) {
                console.error('[Pandorian] Import error:', error);
                showToast('Failed to import: Invalid file format', 'error');
            }
        };

        reader.readAsText(file);
    }

    /**
     * Handle clear all
     */
    function handleClearAll() {
        if (state.shortcuts.length === 0) {
            showToast('No shortcuts to clear', 'info');
            return;
        }

        if (!confirm(`Delete all ${state.shortcuts.length} shortcuts? This cannot be undone.`)) {
            return;
        }

        state.shortcuts = [];
        saveShortcuts(() => {
            showToast('All shortcuts cleared', 'success');
        });
    }

    /**
     * Save shortcuts to storage
     */
    function saveShortcuts(callback) {
        chrome.storage.sync.set({ 
            shortcuts: state.shortcuts,
            keyboardShortcuts: state.keyboardShortcuts
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to save:', chrome.runtime.lastError);
                showToast('Failed to save shortcuts', 'error');
            } else {
                state.filteredShortcuts = state.shortcuts;
                if (callback) callback();
            }
        });
    }

    /**
     * Get available keyboard shortcuts
     */
    function getAvailableKeyboardShortcuts() {
        return [
            { command: 'quick-shortcut-1', label: 'Ctrl+Shift+1' },
            { command: 'quick-shortcut-2', label: 'Ctrl+Shift+2' }
        ];
    }

    /**
     * Get shortcut label from command
     */
    function getShortcutLabel(command) {
        const shortcuts = getAvailableKeyboardShortcuts();
        const found = shortcuts.find(s => s.command === command);
        return found ? found.label : null;
    }

    /**
     * Assign keyboard shortcut to a shortcut
     */
    window.assignKeyboardShortcut = function(index) {
        const shortcut = state.shortcuts[index];
        const available = getAvailableKeyboardShortcuts();
        
        // Find available shortcuts (not already assigned)
        const assignedCommands = Object.values(state.keyboardShortcuts);
        const availableShortcuts = available.filter(s => !assignedCommands.includes(s.command));
        
        if (availableShortcuts.length === 0) {
            showToast('All keyboard shortcuts are assigned. Remove one first.', 'error');
            return;
        }

        // Show selection dialog
        const options = availableShortcuts.map(s => s.label).join('\n');
        const choice = prompt(
            `Assign keyboard shortcut to @${shortcut.key} (${shortcut.name}):\n\n` +
            availableShortcuts.map((s, i) => `${i + 1}. ${s.label}`).join('\n') +
            `\n\nEnter number (1-${availableShortcuts.length}) or press Cancel to remove:`,
            state.keyboardShortcuts[shortcut.key] ? 
                availableShortcuts.findIndex(s => s.command === state.keyboardShortcuts[shortcut.key]) + 1 : ''
        );

        if (choice === null) {
            // Remove assignment
            if (state.keyboardShortcuts[shortcut.key]) {
                delete state.keyboardShortcuts[shortcut.key];
                saveShortcuts(() => {
                    renderList();
                    showToast('Keyboard shortcut removed', 'success');
                });
            }
            return;
        }

        const choiceNum = parseInt(choice);
        if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > availableShortcuts.length) {
            showToast('Invalid selection', 'error');
            return;
        }

        const selected = availableShortcuts[choiceNum - 1];
        
        // Remove previous assignment if exists
        const previousKey = Object.keys(state.keyboardShortcuts).find(
            k => state.keyboardShortcuts[k] === selected.command
        );
        if (previousKey) {
            delete state.keyboardShortcuts[previousKey];
        }

        // Assign new shortcut
        state.keyboardShortcuts[shortcut.key] = selected.command;

        saveShortcuts(() => {
            renderList();
            showToast(`Keyboard shortcut ${selected.label} assigned`, 'success');
        });
    };

    /**
     * Edit shortcut
     */
    window.editShortcut = function(index) {
        if (state.editingIndex !== -1 && state.editingIndex !== index) {
            cancelEdit();
            // Wait for cancel to complete
            setTimeout(() => {
                state.editingIndex = index;
                renderList();
                setTimeout(() => {
                    const input = document.getElementById(`editName-${index}`);
                    if (input) input.focus();
                }, 100);
            }, 50);
        } else {
            state.editingIndex = index;
            renderList();
            setTimeout(() => {
                const input = document.getElementById(`editName-${index}`);
                if (input) input.focus();
            }, 100);
        }
    };

    /**
     * Save edit
     */
    window.saveEdit = function(index) {
        const nameInput = document.getElementById(`editName-${index}`);
        const urlInput = document.getElementById(`editUrl-${index}`);

        if (!nameInput || !urlInput) return;

        const name = nameInput.value.trim();
        const url = urlInput.value.trim();

        if (!name || !url) {
            showToast('Name and URL are required', 'error');
            nameInput.focus();
            return;
        }

        if (!isValidUrl(url) && !url.includes('{q}')) {
            showToast('URL must contain {q} placeholder', 'error');
            urlInput.focus();
            return;
        }

        state.shortcuts[index].name = name;
        state.shortcuts[index].url = url;

        state.editingIndex = -1;
        saveShortcuts(() => {
            renderList();
            showToast('Shortcut updated', 'success');
            // Focus the updated item
            setTimeout(() => {
                const updatedItem = elements.shortcutsList?.querySelector(`[data-index="${index}"]`);
                if (updatedItem) {
                    updatedItem.focus();
                }
            }, 100);
        });
    };

    /**
     * Cancel edit
     */
    window.cancelEdit = function() {
        const previousIndex = state.editingIndex;
        state.editingIndex = -1;
        renderList();
        // Focus the item that was being edited
        if (previousIndex !== -1) {
            setTimeout(() => {
                const item = elements.shortcutsList?.querySelector(`[data-index="${previousIndex}"]`);
                if (item) {
                    item.focus();
                }
            }, 100);
        }
    };

    /**
     * Remove shortcut
     */
    window.removeShortcut = function(index) {
        const shortcut = state.shortcuts[index];
        if (!confirm(`Delete shortcut @${shortcut.key} (${shortcut.name})?`)) {
            return;
        }

        state.shortcuts.splice(index, 1);
        saveShortcuts(() => {
            renderList();
            showToast('Shortcut deleted', 'success');
        });
    };


    /**
     * Utility: Escape HTML
     */
    function escape(s) {
        if (typeof s !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    /**
     * Utility: Validate URL
     */
    function isValidUrl(urlString) {
        try {
            const url = new URL(urlString);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Utility: Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Remove existing toasts
        const existing = document.querySelectorAll('.toast');
        existing.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Handle bookmarks sidebar toggle
     */
    function handleBookmarksSidebarToggle(e) {
        chrome.storage.sync.set({ bookmarksEnabled: e.target.checked }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to save bookmark sidebar setting:', chrome.runtime.lastError);
                elements.bookmarksSidebarToggle.checked = !e.target.checked;
                showToast('Failed to save settings', 'error');
            } else {
                showToast(e.target.checked ? 'Bookmark sidebar enabled' : 'Bookmark sidebar disabled', 'success');
            }
        });
    }

    /**
     * Load bookmark sidebar setting
     */
    function loadBookmarkSidebarSetting() {
        chrome.storage.sync.get([
            'bookmarksEnabled',
            'bookmarkFoldersCollapsedByDefault',
            'bookmarkTheme',
            'bookmarkShowCount',
            'bookmarkEnableDragDrop',
            'bookmarkShowSearch',
            'bookmarkCompactMode',
            'bookmarkAccentColor'
        ], (result) => {
            if (elements.bookmarksSidebarToggle) {
                elements.bookmarksSidebarToggle.checked = result.bookmarksEnabled !== false;
            }
            
            // Load all bookmark settings
            const bookmarkFoldersCollapsed = document.getElementById('bookmarkFoldersCollapsedByDefault');
            if (bookmarkFoldersCollapsed) {
                bookmarkFoldersCollapsed.checked = result.bookmarkFoldersCollapsedByDefault !== false;
            }
            
            // Load theme
            renderBookmarkThemes(result.bookmarkTheme || 'black');
            
            const showCount = document.getElementById('bookmarkShowCount');
            if (showCount) {
                showCount.checked = result.bookmarkShowCount !== false;
            }
            
            const enableDragDrop = document.getElementById('bookmarkEnableDragDrop');
            if (enableDragDrop) {
                enableDragDrop.checked = result.bookmarkEnableDragDrop !== false;
            }
            
            const showSearch = document.getElementById('bookmarkShowSearch');
            if (showSearch) {
                showSearch.checked = result.bookmarkShowSearch !== false;
            }
            
            const compactMode = document.getElementById('bookmarkCompactMode');
            if (compactMode) {
                compactMode.checked = result.bookmarkCompactMode === true;
            }

            // Load accent color
            const accentColor = document.getElementById('bookmarkAccentColor');
            if (accentColor) {
                accentColor.value = result.bookmarkAccentColor || '#8b5cf6';
            }
        });
    }

    /**
     * Render bookmark themes (white and black background themes)
     */
    function renderBookmarkThemes(selectedTheme) {
        const themeGrid = document.getElementById('bookmarkThemeGrid');
        if (!themeGrid) return;

        const themes = {
            black: { name: 'Black', bgColor: '#141414', textColor: '#ffffff' },
            white: { name: 'White', bgColor: '#ffffff', textColor: '#000000' }
        };

        themeGrid.innerHTML = '';
        
        Object.keys(themes).forEach(themeKey => {
            const theme = themes[themeKey];
            const option = document.createElement('div');
            option.className = `bookmark-theme-option ${selectedTheme === themeKey ? 'selected' : ''}`;
            option.setAttribute('data-theme', themeKey);
            option.setAttribute('title', theme.name);
            
            const colorPreview = document.createElement('div');
            colorPreview.className = 'bookmark-theme-color-preview';
            colorPreview.style.backgroundColor = theme.bgColor;
            colorPreview.style.borderColor = themeKey === 'white' ? '#e0e0e0' : '#333';
            
            const label = document.createElement('span');
            label.textContent = theme.name;
            
            option.appendChild(colorPreview);
            option.appendChild(label);
            
            option.addEventListener('click', () => {
                chrome.storage.sync.set({ bookmarkTheme: themeKey }, () => {
                    renderBookmarkThemes(themeKey);
                    showToast('Theme updated', 'success');
                });
            });
            
            themeGrid.appendChild(option);
        });
    }

    /**
     * Attach bookmark settings event listeners
     */
    function attachBookmarkSettingsListeners() {
        // Auto-collapse folders
        const bookmarkFoldersCollapsed = document.getElementById('bookmarkFoldersCollapsedByDefault');
        if (bookmarkFoldersCollapsed) {
            bookmarkFoldersCollapsed.addEventListener('change', (e) => {
                chrome.storage.sync.set({ bookmarkFoldersCollapsedByDefault: e.target.checked }, () => {
                    showToast(e.target.checked ? 'Folders will auto-collapse' : 'Folders will remain expanded', 'success');
                });
            });
        }

        // Accent color
        const accentColor = document.getElementById('bookmarkAccentColor');
        const colorPreview = document.getElementById('bookmarkColorPreview');
        const colorValue = document.getElementById('bookmarkColorValue');
        
        // Load current accent color
        chrome.storage.sync.get(['bookmarkAccentColor'], (result) => {
            const currentColor = result.bookmarkAccentColor || '#8b5cf6';
            if (accentColor) accentColor.value = currentColor;
            if (colorPreview) colorPreview.style.background = currentColor;
            if (colorValue) colorValue.textContent = currentColor.toUpperCase();
        });
        
        if (accentColor) {
            accentColor.addEventListener('input', (e) => {
                const color = e.target.value;
                if (colorPreview) colorPreview.style.background = color;
                if (colorValue) colorValue.textContent = color.toUpperCase();
            });
            
            accentColor.addEventListener('change', (e) => {
                chrome.storage.sync.set({ bookmarkAccentColor: e.target.value }, () => {
                    showToast('Accent color updated', 'success');
                });
            });
        }
        
        // Click preview to open color picker
        if (colorPreview && accentColor) {
            colorPreview.addEventListener('click', () => {
                accentColor.click();
            });
        }

        // Show count
        const showCount = document.getElementById('bookmarkShowCount');
        if (showCount) {
            showCount.addEventListener('change', (e) => {
                chrome.storage.sync.set({ bookmarkShowCount: e.target.checked }, () => {
                    showToast('Setting saved', 'success');
                });
            });
        }

        // Enable drag & drop
        const enableDragDrop = document.getElementById('bookmarkEnableDragDrop');
        if (enableDragDrop) {
            enableDragDrop.addEventListener('change', (e) => {
                chrome.storage.sync.set({ bookmarkEnableDragDrop: e.target.checked }, () => {
                    showToast('Setting saved', 'success');
                });
            });
        }

        // Show search
        const showSearch = document.getElementById('bookmarkShowSearch');
        if (showSearch) {
            showSearch.addEventListener('change', (e) => {
                chrome.storage.sync.set({ bookmarkShowSearch: e.target.checked }, () => {
                    showToast('Setting saved', 'success');
                });
            });
        }

        // Compact mode
        const compactMode = document.getElementById('bookmarkCompactMode');
        if (compactMode) {
            compactMode.addEventListener('change', (e) => {
                chrome.storage.sync.set({ bookmarkCompactMode: e.target.checked }, () => {
                    showToast('Setting saved', 'success');
                });
            });
        }

        // Load hidden bookmarks and sidebar visibility
        loadHiddenBookmarks();
        loadHiddenWebsites();
        loadSidebarVisibility();
        
        // Show sidebar button
        const showSidebarBtn = document.getElementById('showSidebarBtn');
        if (showSidebarBtn) {
            showSidebarBtn.addEventListener('click', () => {
                chrome.storage.sync.set({ 
                    sidebarHiddenUntil: null,
                    sidebarHiddenPermanent: false
                }, () => {
                    showToast('Sidebar will be visible again', 'success');
                    loadSidebarVisibility();
                });
            });
        }

        // Listen for changes to hidden bookmarks and websites
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.hiddenBookmarks) {
                loadHiddenBookmarks();
            }
            if (changes.sidebarHiddenWebsites) {
                loadHiddenWebsites();
            }
            if (changes.sidebarHiddenUntil || changes.sidebarHiddenPermanent) {
                loadSidebarVisibility();
            }
        });
    }

    /**
     * Load and display hidden bookmarks
     */
    function loadHiddenBookmarks() {
        const hiddenBookmarksList = document.getElementById('hiddenBookmarksList');
        if (!hiddenBookmarksList) return;

        chrome.storage.sync.get(['hiddenBookmarks'], (result) => {
            const hiddenIds = result.hiddenBookmarks || [];
            
            if (hiddenIds.length === 0) {
                hiddenBookmarksList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">No hidden bookmarks</p>';
                return;
            }

            // Fetch bookmark details
            Promise.all(hiddenIds.map(id => {
                return new Promise((resolve) => {
                    chrome.bookmarks.get(id, (bookmarks) => {
                        resolve(bookmarks && bookmarks.length > 0 ? bookmarks[0] : null);
                    });
                });
            })).then(bookmarks => {
                const validBookmarks = bookmarks.filter(b => b !== null);
                
                if (validBookmarks.length === 0) {
                    hiddenBookmarksList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">No hidden bookmarks</p>';
                    return;
                }

                hiddenBookmarksList.innerHTML = validBookmarks.map(bookmark => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--bg-input); border-radius: 8px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-main); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${escapeHtml(bookmark.title)}
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${escapeHtml(bookmark.url)}
                            </div>
                        </div>
                        <button class="btn btn-subtle" data-bookmark-id="${bookmark.id}" style="margin-left: 10px; padding: 6px 12px; font-size: 12px;" title="Unhide bookmark">
                            Show
                        </button>
                    </div>
                `).join('');

                // Add click handlers for unhide buttons
                hiddenBookmarksList.querySelectorAll('[data-bookmark-id]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const bookmarkId = e.target.getAttribute('data-bookmark-id');
                        unhideBookmark(bookmarkId);
                    });
                });
            });
        });
    }

    /**
     * Unhide a bookmark
     */
    function unhideBookmark(bookmarkId) {
        chrome.storage.sync.get(['hiddenBookmarks'], (result) => {
            const hidden = new Set(result.hiddenBookmarks || []);
            hidden.delete(bookmarkId);
            
            chrome.storage.sync.set({ hiddenBookmarks: Array.from(hidden) }, () => {
                if (chrome.runtime.lastError) {
                    showToast('Failed to unhide bookmark', 'error');
                    return;
                }
                
                showToast('Bookmark unhidden', 'success');
                loadHiddenBookmarks();
            });
        });
    }

    /**
     * Load and display sidebar visibility status
     */
    function loadSidebarVisibility() {
        const sidebarVisibilityStatus = document.getElementById('sidebarVisibilityStatus');
        const showSidebarBtn = document.getElementById('showSidebarBtn');
        if (!sidebarVisibilityStatus) return;

        chrome.storage.sync.get(['sidebarHiddenUntil', 'sidebarHiddenPermanent'], (result) => {
            if (result.sidebarHiddenPermanent) {
                sidebarVisibilityStatus.innerHTML = `
                    <p style="margin: 0; color: var(--text-main);">
                        <strong style="color: var(--danger);">Sidebar is hidden permanently</strong>
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--text-muted);">
                        Right-click empty space in the sidebar and select "Hide sidebar permanently" to hide it.
                    </p>
                `;
                if (showSidebarBtn) showSidebarBtn.style.display = 'block';
            } else if (result.sidebarHiddenUntil) {
                const now = Date.now();
                const timeLeft = result.sidebarHiddenUntil - now;
                
                if (timeLeft > 0) {
                    const minutes = Math.ceil(timeLeft / (60 * 1000));
                    sidebarVisibilityStatus.innerHTML = `
                        <p style="margin: 0; color: var(--text-main);">
                            <strong style="color: var(--accent-glow);">Sidebar is hidden for ${minutes} more minute${minutes !== 1 ? 's' : ''}</strong>
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--text-muted);">
                            The sidebar will automatically appear again when the time expires.
                        </p>
                    `;
                    if (showSidebarBtn) showSidebarBtn.style.display = 'block';
                } else {
                    // Time expired
                    chrome.storage.sync.set({ sidebarHiddenUntil: null }, () => {
                        loadSidebarVisibility();
                    });
                }
            } else {
                sidebarVisibilityStatus.innerHTML = `
                    <p style="margin: 0; color: var(--text-main);">
                        <strong style="color: var(--accent-glow);">Sidebar is visible</strong>
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--text-muted);">
                        Right-click empty space in the sidebar to hide it temporarily or permanently.
                    </p>
                `;
                if (showSidebarBtn) showSidebarBtn.style.display = 'none';
            }
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
