/**
 * Bookmark Sidebar Controller
 * Enhanced with collapsible folders, drag & drop, settings, and themes
 */

(function() {
    'use strict';

    const elements = {
        bookmarksContainer: document.getElementById('bookmarksContainer'),
        bookmarkCount: document.getElementById('bookmarkCount'),
        bookmarkSearchInput: document.getElementById('bookmarkSearchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        bookmarkSettingsBtn: document.getElementById('bookmarkSettingsBtn'),
        sidebarContextMenu: document.getElementById('sidebarContextMenu'),
        sidebar: document.getElementById('pandorian-bookmark-sidebar')
    };

    let allBookmarks = [];
    let filteredBookmarks = [];
    let bookmarkFolderTree = []; // Store folder tree structure
    let searchQuery = '';
    let collapsedFolders = new Set(); // Track collapsed folders
    let draggedElement = null;
    let dragOverElement = null;
    let bookmarkTheme = 'purple'; // Default theme
    let hiddenBookmarks = new Set(); // Track hidden bookmark IDs
    let hiddenFolders = new Set(); // Track hidden folder names/paths
    let bookmarkSettings = {
        sidebarWidth: 260,
        showCount: true,
        enableDragDrop: true,
        showSearch: true,
        compactMode: false
    };

    // Bookmark themes
    const themes = {
        purple: { name: 'Purple', color: '#8b5cf6' },
        blue: { name: 'Blue', color: '#3e6bf2' },
        teal: { name: 'Teal', color: '#37bf99' },
        orange: { name: 'Orange', color: '#f4572f' },
        red: { name: 'Red', color: '#f74b58' },
        pink: { name: 'Pink', color: '#f5a2bf' },
        cyan: { name: 'Cyan', color: '#1a90ba' },
        green: { name: 'Green', color: '#b4bd0e' },
        yellow: { name: 'Yellow', color: '#fdde32' }
    };

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Highlight search matches
     */
    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        const regex = new RegExp(`(${escapeHtml(query)})`, 'gi');
        return escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    /**
     * Create bookmark item element
     */
    function createBookmarkItem(bookmark) {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.setAttribute('data-bookmark-id', bookmark.id);
        item.setAttribute('draggable', bookmarkSettings.enableDragDrop ? 'true' : 'false');
        item.setAttribute('tabindex', '0');
        
        const highlightedTitle = highlightText(bookmark.title, searchQuery);
        const highlightedUrl = highlightText(bookmark.url, searchQuery);
        
        item.innerHTML = `
            <div class="bookmark-info">
                <div class="bookmark-title">${highlightedTitle}</div>
                <div class="bookmark-url">${highlightedUrl}</div>
            </div>
            <div class="bookmark-actions" style="display: none;">
                <button class="bookmark-action-btn bookmark-edit-btn" title="Edit bookmark" data-action="edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="bookmark-action-btn bookmark-hide-btn" title="Hide in Pandorian" data-action="hide">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                </button>
                <button class="bookmark-action-btn bookmark-delete-btn" title="Delete bookmark" data-action="delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        const bookmarkInfo = item.querySelector('.bookmark-info');
        const bookmarkActions = item.querySelector('.bookmark-actions');
        const editBtn = item.querySelector('.bookmark-edit-btn');
        const hideBtn = item.querySelector('.bookmark-hide-btn');
        const deleteBtn = item.querySelector('.bookmark-delete-btn');
        
        // Show actions on hover
        item.addEventListener('mouseenter', () => {
            item.classList.add('active');
            if (bookmarkActions) {
                bookmarkActions.style.display = 'flex';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            item.classList.remove('active');
            if (bookmarkActions && !item.classList.contains('editing')) {
                bookmarkActions.style.display = 'none';
            }
        });
        
        // Click handler - open bookmark (but not if clicking action buttons or editing)
        item.addEventListener('click', (e) => {
            // Don't open if clicking action buttons, edit inputs, or save/cancel buttons
            if (e.target.closest('.bookmark-actions') || 
                e.target.closest('.bookmark-edit-title') ||
                e.target.closest('.bookmark-edit-url') ||
                e.target.closest('.bookmark-edit-actions') ||
                e.target.closest('.bookmark-confirm-delete-btn') ||
                e.target.closest('.bookmark-cancel-delete-btn') ||
                item.classList.contains('editing') ||
                item.classList.contains('deleting')) {
                return;
            }
            chrome.tabs.create({ url: bookmark.url, active: true });
        });
        
        // Edit button handler
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                enterEditMode(item, bookmark);
            });
        }
        
        // Hide button handler
        if (hideBtn) {
            hideBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideBookmark(bookmark);
            });
        }
        
        // Delete button handler
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBookmark(item, bookmark);
            });
        }
        
        // Right-click handler - toggle edit mode
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle edit mode
            if (item.classList.contains('editing')) {
                exitEditMode(item, bookmark);
            } else {
                enterEditMode(item, bookmark);
            }
        });

        // Keyboard handler
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                chrome.tabs.create({ url: bookmark.url, active: true });
            }
        });

        // Drag handlers (only if drag & drop is enabled)
        if (bookmarkSettings.enableDragDrop) {
            item.addEventListener('dragstart', (e) => {
                if (item.classList.contains('editing') || item.classList.contains('deleting')) {
                    e.preventDefault();
                    return;
                }
                draggedElement = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                if (dragOverElement) {
                    dragOverElement.classList.remove('drag-over');
                    dragOverElement = null;
                }
                draggedElement = null;
            });

            item.addEventListener('dragover', (e) => {
                if (item.classList.contains('editing') || item.classList.contains('deleting')) {
                    return;
                }
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverElement && dragOverElement !== item) {
                    dragOverElement.classList.remove('drag-over');
                }
                dragOverElement = item;
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                if (draggedElement && draggedElement !== item) {
                    handleBookmarkReorder(draggedElement, item);
                }
            });
        }

        return item;
    }

    /**
     * Enter edit mode for bookmark
     */
    function enterEditMode(item, bookmark) {
        if (item.classList.contains('editing')) return;
        
        item.classList.add('editing');
        const bookmarkInfo = item.querySelector('.bookmark-info');
        const bookmarkActions = item.querySelector('.bookmark-actions');
        
        const originalTitle = bookmark.title;
        const originalUrl = bookmark.url;
        
        bookmarkInfo.innerHTML = `
            <input type="text" class="bookmark-edit-title" value="${escapeHtml(originalTitle)}" placeholder="Bookmark title">
            <input type="text" class="bookmark-edit-url" value="${escapeHtml(originalUrl)}" placeholder="URL">
            <div class="bookmark-edit-actions">
                <button class="bookmark-save-btn" title="Save">Save</button>
                <button class="bookmark-cancel-btn" title="Cancel">Cancel</button>
            </div>
        `;
        
        if (bookmarkActions) {
            bookmarkActions.style.display = 'none';
        }
        
        const titleInput = bookmarkInfo.querySelector('.bookmark-edit-title');
        const urlInput = bookmarkInfo.querySelector('.bookmark-edit-url');
        const saveBtn = bookmarkInfo.querySelector('.bookmark-save-btn');
        const cancelBtn = bookmarkInfo.querySelector('.bookmark-cancel-btn');
        
        // Focus title input
        setTimeout(() => titleInput?.focus(), 10);
        
        // Save handler
        const saveHandler = () => {
            const newTitle = titleInput.value.trim();
            const newUrl = urlInput.value.trim();
            
            if (!newTitle || !newUrl) {
                showToast('Title and URL are required', 'error');
                return;
            }
            
            if (!isValidUrl(newUrl)) {
                showToast('Invalid URL format', 'error');
                return;
            }
            
            try {
                chrome.bookmarks.update(bookmark.id, {
                    title: newTitle,
                    url: newUrl
                }, (updatedBookmark) => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to update bookmark:', chrome.runtime.lastError);
                        showToast('Failed to update bookmark', 'error');
                        exitEditMode(item, bookmark);
                        return;
                    }
                    
                    showToast('Bookmark updated', 'success');
                    // Bookmarks will reload automatically via listener
                });
            } catch (error) {
                console.error('[Pandorian] Extension context invalidated:', error);
                showToast('Extension was reloaded. Please refresh the page.', 'error');
            }
        };
        
        // Cancel handler
        const cancelHandler = () => {
            exitEditMode(item, bookmark);
        };
        
        saveBtn?.addEventListener('click', saveHandler);
        cancelBtn?.addEventListener('click', cancelHandler);
        
        // Keyboard handlers
        titleInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                urlInput?.focus();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        });
        
        urlInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveHandler();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        });
    }

    /**
     * Exit edit mode
     */
    function exitEditMode(item, bookmark) {
        item.classList.remove('editing');
        // Reload bookmarks will recreate the item
        loadBookmarks();
    }

    /**
     * Enter rename mode for folder
     */
    function enterRenameFolderMode(header, currentTitle, folderWrapper) {
        if (header.classList.contains('renaming')) return;
        
        header.classList.add('renaming');
        const originalTitle = currentTitle;
        const titleSpan = header.querySelector('span');
        const originalContent = header.innerHTML;
        
        header.innerHTML = `
            <div class="folder-toggle">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>
            <input type="text" class="folder-rename-input" value="${escapeHtml(originalTitle)}" placeholder="Folder name">
            <div class="folder-rename-actions">
                <button class="folder-save-btn" title="Save">Save</button>
                <button class="folder-cancel-btn" title="Cancel">Cancel</button>
            </div>
        `;
        
        const renameInput = header.querySelector('.folder-rename-input');
        const saveBtn = header.querySelector('.folder-save-btn');
        const cancelBtn = header.querySelector('.folder-cancel-btn');
        
        // Focus input
        setTimeout(() => renameInput?.focus(), 10);
        renameInput?.select();
        
        // Save handler
        const saveHandler = () => {
            const newTitle = renameInput.value.trim();
            
            if (!newTitle) {
                showToast('Folder name is required', 'error');
                return;
            }
            
            if (newTitle === originalTitle) {
                exitRenameFolderMode(header, originalTitle);
                return;
            }
            
            // Find folder by title and rename it
            chrome.bookmarks.getTree((tree) => {
                function findAndRenameFolder(nodes, oldTitle, newTitle) {
                    for (const node of nodes) {
                        if (node.title === oldTitle && !node.url) {
                            chrome.bookmarks.update(node.id, { title: newTitle }, () => {
                                if (chrome.runtime.lastError) {
                                    console.error('[Pandorian] Failed to rename folder:', chrome.runtime.lastError);
                                    showToast('Failed to rename folder', 'error');
                                    exitRenameFolderMode(header, originalTitle);
                                    return;
                                }
                                showToast('Folder renamed', 'success');
                                loadBookmarks();
                            });
                            return true;
                        }
                        if (node.children) {
                            if (findAndRenameFolder(node.children, oldTitle, newTitle)) {
                                return true;
                            }
                        }
                    }
                    return false;
                }
                
                findAndRenameFolder(tree, originalTitle, newTitle);
            });
        };
        
        // Cancel handler
        const cancelHandler = () => {
            exitRenameFolderMode(header, originalTitle);
        };
        
        saveBtn?.addEventListener('click', saveHandler);
        cancelBtn?.addEventListener('click', cancelHandler);
        
        // Keyboard handlers
        renameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveHandler();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        });
    }

    /**
     * Exit rename mode for folder
     */
    function exitRenameFolderMode(header, originalTitle) {
        header.classList.remove('renaming');
        // Reload bookmarks will recreate the folder
        loadBookmarks();
    }

    /**
     * Delete bookmark with inline confirmation
     */
    function deleteBookmark(item, bookmark) {
        if (item.classList.contains('deleting')) {
            // Confirm deletion
            chrome.bookmarks.remove(bookmark.id, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to delete bookmark:', chrome.runtime.lastError);
                    showToast('Failed to delete bookmark', 'error');
                    item.classList.remove('deleting');
                    return;
                }
                
                showToast('Bookmark deleted', 'success');
                // Bookmarks will reload automatically via listener
            });
        } else {
            // Show delete confirmation
            item.classList.add('deleting');
            const bookmarkInfo = item.querySelector('.bookmark-info');
            const originalContent = bookmarkInfo.innerHTML;
            
            bookmarkInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                    <span style="font-size: 12px; color: var(--text-muted);">Delete "${escapeHtml(bookmark.title)}"?</span>
                    <div style="display: flex; gap: 6px; margin-left: auto;">
                        <button class="bookmark-confirm-delete-btn" style="padding: 4px 12px; font-size: 11px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                        <button class="bookmark-cancel-delete-btn" style="padding: 4px 12px; font-size: 11px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
            `;
            
            const confirmBtn = bookmarkInfo.querySelector('.bookmark-confirm-delete-btn');
            const cancelBtn = bookmarkInfo.querySelector('.bookmark-cancel-delete-btn');
            
            confirmBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.bookmarks.remove(bookmark.id, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to delete bookmark:', chrome.runtime.lastError);
                        showToast('Failed to delete bookmark', 'error');
                        item.classList.remove('deleting');
                        bookmarkInfo.innerHTML = originalContent;
                        return;
                    }
                    
                    showToast('Bookmark deleted', 'success');
                    // Bookmarks will reload automatically via listener
                });
            });
            
            cancelBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                item.classList.remove('deleting');
                bookmarkInfo.innerHTML = originalContent;
            });
        }
    }

    /**
     * Hide folder in Pandorian
     */
    function hideFolder(folderName) {
        try {
            if (!chrome || !chrome.storage) {
                console.error('[Pandorian] Extension context invalidated');
                return;
            }
            
            chrome.storage.sync.get(['hiddenFolders'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to hide folder:', chrome.runtime.lastError);
                    return;
                }
                
                const hidden = new Set(result.hiddenFolders || []);
                hidden.add(folderName);
                
                chrome.storage.sync.set({ hiddenFolders: Array.from(hidden) }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to hide folder:', chrome.runtime.lastError);
                        showToast('Failed to hide folder', 'error');
                        return;
                    }
                    
                    showToast('Folder hidden in Pandorian', 'success');
                    // Reload bookmarks to update display
                    loadBookmarks();
                });
            });
        } catch (error) {
            console.error('[Pandorian] Extension context invalidated:', error);
        }
    }

    /**
     * Hide folder in Pandorian
     */
    function hideFolder(folderName) {
        try {
            if (!chrome || !chrome.storage) {
                console.error('[Pandorian] Extension context invalidated');
                return;
            }
            
            chrome.storage.sync.get(['hiddenFolders'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to hide folder:', chrome.runtime.lastError);
                    return;
                }
                
                const hidden = new Set(result.hiddenFolders || []);
                hidden.add(folderName);
                
                chrome.storage.sync.set({ hiddenFolders: Array.from(hidden) }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to hide folder:', chrome.runtime.lastError);
                        showToast('Failed to hide folder', 'error');
                        return;
                    }
                    
                    showToast('Folder hidden in Pandorian', 'success');
                    // Reload bookmarks to update display
                    loadBookmarks();
                });
            });
        } catch (error) {
            console.error('[Pandorian] Extension context invalidated:', error);
        }
    }

    /**
     * Hide bookmark in Pandorian
     */
    function hideBookmark(bookmark) {
        try {
            if (!chrome || !chrome.storage) {
                console.error('[Pandorian] Extension context invalidated');
                return;
            }
            
            chrome.storage.sync.get(['hiddenBookmarks'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to hide bookmark:', chrome.runtime.lastError);
                    return;
                }
                
                const hidden = new Set(result.hiddenBookmarks || []);
                hidden.add(bookmark.id);
                
                chrome.storage.sync.set({ hiddenBookmarks: Array.from(hidden) }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to hide bookmark:', chrome.runtime.lastError);
                        showToast('Failed to hide bookmark', 'error');
                        return;
                    }
                    
                    showToast('Bookmark hidden in Pandorian', 'success');
                    // Reload bookmarks to update display
                    loadBookmarks();
                });
            });
        } catch (error) {
            console.error('[Pandorian] Extension context invalidated:', error);
        }
    }

    /**
     * Setup right-click context menu
     */
    function setupContextMenu() {
        if (!elements.sidebarContextMenu) return;

        const sidebar = elements.sidebar || document.getElementById('pandorian-bookmark-sidebar') || document.body;
        
        // Right-click handler on sidebar (empty space)
        sidebar.addEventListener('contextmenu', (e) => {
            // Don't show menu if clicking on bookmarks, folders, buttons, or other interactive elements
            if (e.target.closest('.bookmark-item') ||
                e.target.closest('.bookmark-actions') ||
                e.target.closest('.bookmark-folder') ||
                e.target.closest('.folder-header') ||
                e.target.closest('.sidebar-header') ||
                e.target.closest('.sidebar-search') ||
                e.target.closest('.add-bookmark-placeholder')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            showContextMenu(e.clientX, e.clientY);
        });

        // Click outside to close menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar-context-menu')) {
                hideContextMenu();
            }
        });

        // Handle context menu item clicks
        elements.sidebarContextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;

            const action = item.getAttribute('data-action');
            handleContextMenuAction(action);
            hideContextMenu();
        });
    }

    /**
     * Show context menu at position
     */
    function showContextMenu(x, y) {
        if (!elements.sidebarContextMenu) return;

        // Get current website name
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].url) {
                try {
                    const url = new URL(tabs[0].url);
                    const websiteName = url.hostname.replace('www.', '');
                    const websiteNameSpan = document.getElementById('currentWebsiteName');
                    if (websiteNameSpan) {
                        websiteNameSpan.textContent = websiteName;
                    }
                } catch (e) {
                    // If URL parsing fails, keep default text
                }
            }
        });

        const menu = elements.sidebarContextMenu;
        menu.style.display = 'flex';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Adjust position if menu goes off screen
        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = `${window.innerWidth - rect.width - 10}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${window.innerHeight - rect.height - 10}px`;
            }
        }, 0);
    }

    /**
     * Hide context menu
     */
    function hideContextMenu() {
        if (elements.sidebarContextMenu) {
            elements.sidebarContextMenu.style.display = 'none';
        }
    }

    /**
     * Handle context menu actions
     */
    function handleContextMenuAction(action) {
        switch (action) {
            case 'hide-5m':
                hideSidebar(5 * 60 * 1000); // 5 minutes in milliseconds
                break;
            case 'hide-30m':
                hideSidebar(30 * 60 * 1000); // 30 minutes in milliseconds
                break;
            case 'hide-permanent':
                hideSidebar(null); // null = permanent
                break;
            case 'hide-on-website':
                hideSidebarOnWebsite();
                break;
        }
    }

    /**
     * Hide sidebar on current website permanently
     */
    function hideSidebarOnWebsite() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].url) {
                showToast('Unable to get current website', 'error');
                return;
            }

            try {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname.replace('www.', '');

                chrome.storage.sync.get(['sidebarHiddenWebsites'], (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to get hidden websites:', chrome.runtime.lastError);
                        showToast('Failed to hide sidebar on website', 'error');
                        return;
                    }

                    const hiddenWebsites = new Set(result.sidebarHiddenWebsites || []);
                    hiddenWebsites.add(hostname);

                    chrome.storage.sync.set({ sidebarHiddenWebsites: Array.from(hiddenWebsites) }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('[Pandorian] Failed to hide sidebar on website:', chrome.runtime.lastError);
                            showToast('Failed to hide sidebar on website', 'error');
                            return;
                        }

                        showToast(`Sidebar hidden on ${hostname}`, 'success');

                        // Notify content script to hide sidebar
                        if (window.parent) {
                            window.parent.postMessage({
                                type: 'pandorian-hide-sidebar',
                                website: hostname,
                                permanent: true
                            }, '*');
                        }
                    });
                });
            } catch (error) {
                console.error('[Pandorian] Failed to parse URL:', error);
                showToast('Failed to hide sidebar on website', 'error');
            }
        });
    }

    /**
     * Hide sidebar for specified duration
     */
    function hideSidebar(durationMs) {
        const hideUntil = durationMs ? Date.now() + durationMs : null;
        
        try {
            chrome.storage.sync.set({ 
                sidebarHiddenUntil: hideUntil,
                sidebarHiddenPermanent: hideUntil === null
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to hide sidebar:', chrome.runtime.lastError);
                    showToast('Failed to hide sidebar', 'error');
                    return;
                }
                
                const message = hideUntil === null 
                    ? 'Sidebar hidden permanently' 
                    : `Sidebar hidden for ${durationMs === 5 * 60 * 1000 ? '5 minutes' : '30 minutes'}`;
                
                showToast(message, 'success');
                
                // Notify content script to hide sidebar via postMessage
                if (window.parent) {
                    window.parent.postMessage({
                        type: 'pandorian-hide-sidebar',
                        duration: durationMs,
                        permanent: hideUntil === null
                    }, '*');
                }
            });
        } catch (error) {
            console.error('[Pandorian] Extension context invalidated:', error);
            showToast('Extension was reloaded. Please refresh the page.', 'error');
        }
    }

    /**
     * Check if sidebar should be hidden
     */
    function checkSidebarVisibility() {
        try {
            chrome.storage.sync.get(['sidebarHiddenUntil', 'sidebarHiddenPermanent'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to check sidebar visibility:', chrome.runtime.lastError);
                    return;
                }
                
                if (result.sidebarHiddenPermanent) {
                    // Sidebar is permanently hidden - notify content script
                    if (window.parent) {
                        window.parent.postMessage({
                            type: 'pandorian-hide-sidebar',
                            permanent: true
                        }, '*');
                    }
                    return;
                }

                if (result.sidebarHiddenUntil) {
                    const now = Date.now();
                    if (now < result.sidebarHiddenUntil) {
                        // Still hidden - notify content script
                        if (window.parent) {
                            window.parent.postMessage({
                                type: 'pandorian-hide-sidebar',
                                duration: result.sidebarHiddenUntil - now
                            }, '*');
                        }
                    } else {
                        // Time expired - clear hide state
                        chrome.storage.sync.set({ 
                            sidebarHiddenUntil: null 
                        });
                    }
                }
            });
        } catch (error) {
            console.error('[Pandorian] Extension context invalidated:', error);
        }
    }

    /**
     * Validate URL
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
     * Handle bookmark reordering
     */
    function handleBookmarkReorder(draggedItem, targetItem) {
        const draggedId = draggedItem.getAttribute('data-bookmark-id');
        const targetId = targetItem.getAttribute('data-bookmark-id');
        
        // Get bookmark positions
        const draggedIndex = allBookmarks.findIndex(b => b.id === draggedId);
        const targetIndex = allBookmarks.findIndex(b => b.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Reorder in array
        const [moved] = allBookmarks.splice(draggedIndex, 1);
        allBookmarks.splice(targetIndex, 0, moved);
        
        // Re-render
        filteredBookmarks = searchQuery ? filterBookmarks(allBookmarks, searchQuery) : allBookmarks;
        renderBookmarks(filteredBookmarks);
    }

    /**
     * Create collapsible folder header
     */
    function createFolderHeader(title, bookmarks, depth = 0) {
        const folderWrapper = document.createElement('div');
        folderWrapper.className = 'folder-wrapper';
        folderWrapper.setAttribute('data-folder', title);
        folderWrapper.style.paddingLeft = `${depth * 16}px`;
        
        const header = document.createElement('div');
        header.className = 'bookmark-folder';
        header.setAttribute('draggable', 'true');
        
        const isCollapsed = collapsedFolders.has(title);
        
        header.innerHTML = `
            <div class="folder-toggle ${isCollapsed ? 'collapsed' : ''}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>
            <span>${escapeHtml(title)}</span>
            <span style="margin-left: auto; font-size: 10px; opacity: 0.6;">${bookmarks.length}</span>
            <button class="folder-hide-btn" title="Hide in Pandorian" data-action="hide-folder" style="background: transparent; border: none; cursor: pointer; padding: 4px; margin-left: 8px; color: var(--text-muted); opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            </button>
        `;
        
        // Show hide button on hover
        header.addEventListener('mouseenter', () => {
            const hideBtn = header.querySelector('.folder-hide-btn');
            if (hideBtn) hideBtn.style.opacity = '1';
        });
        
        header.addEventListener('mouseleave', () => {
            const hideBtn = header.querySelector('.folder-hide-btn');
            if (hideBtn && !header.classList.contains('renaming')) hideBtn.style.opacity = '0';
        });
        
        // Hide button handler
        const hideBtn = header.querySelector('.folder-hide-btn');
        if (hideBtn) {
            hideBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideFolder(title);
            });
        }
        
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking hide button
            if (e.target.closest('.folder-hide-btn')) {
                return;
            }
            // Toggle on clicking anywhere on header (but not when dragging)
            if (!header.classList.contains('dragging')) {
                toggleFolder(title);
            }
        });

        // Drag handlers for folder
        header.addEventListener('dragstart', (e) => {
            draggedElement = folderWrapper;
            header.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
            if (dragOverElement) {
                dragOverElement.classList.remove('drag-over');
                dragOverElement = null;
            }
            draggedElement = null;
        });

        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverElement && dragOverElement !== header) {
                dragOverElement.classList.remove('drag-over');
            }
            dragOverElement = header;
            header.classList.add('drag-over');
        });

        header.addEventListener('dragleave', () => {
            header.classList.remove('drag-over');
        });

        header.addEventListener('drop', (e) => {
            e.preventDefault();
            header.classList.remove('drag-over');
            if (draggedElement && draggedElement !== folderWrapper) {
                handleFolderReorder(draggedElement, folderWrapper);
            }
        });
        
        // Right-click handler - toggle rename mode for folder
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle rename mode
            if (header.classList.contains('renaming')) {
                exitRenameFolderMode(header, title);
            } else {
                enterRenameFolderMode(header, title, folderWrapper);
            }
        });

        const content = document.createElement('div');
        content.className = `folder-content ${isCollapsed ? 'collapsed' : ''}`;
        content.setAttribute('data-folder-content', title);
        
        folderWrapper.appendChild(header);
        folderWrapper.appendChild(content);
        
        return folderWrapper;
    }

    /**
     * Toggle folder collapse state
     */
    function toggleFolder(folderName) {
        if (collapsedFolders.has(folderName)) {
            collapsedFolders.delete(folderName);
        } else {
            collapsedFolders.add(folderName);
        }
        
        // Save collapsed state
        chrome.storage.sync.set({ collapsedBookmarkFolders: Array.from(collapsedFolders) }, () => {});
        
        // Update UI
        const content = elements.bookmarksContainer.querySelector(`[data-folder-content="${folderName}"]`);
        const toggle = elements.bookmarksContainer.querySelector(`[data-folder="${folderName}"] .folder-toggle`);
        
        if (content) {
            content.classList.toggle('collapsed');
        }
        if (toggle) {
            toggle.classList.toggle('collapsed');
        }
    }

    /**
     * Handle folder reordering
     */
    function handleFolderReorder(draggedFolder, targetFolder) {
        // This would require more complex logic to reorder folders in Chrome bookmarks
        // For now, just re-render to show visual feedback
        renderBookmarks(filteredBookmarks);
    }

    /**
     * Organize bookmarks by folder (preserves nested folder structure)
     */
    function organizeBookmarks(nodes) {
        const folderTree = [];
        const flatBookmarks = [];
        
        function traverse(node, parentPath = [], parentFolder = null, rootFolderName = null) {
            // Check if it's a bookmark first
            if (node.url) {
                // It's a bookmark
                let folderPath;
                if (parentPath.length > 0) {
                    folderPath = parentPath.join(' > ');
                } else {
                    // Bookmark at root level - use root folder name
                    folderPath = rootFolderName || 'Other Bookmarks';
                }
                
                const bookmarkData = {
                    id: node.id,
                    title: node.title,
                    url: node.url,
                    folder: folderPath,
                    folderPath: parentPath.length > 0 ? [...parentPath] : []
                };
                flatBookmarks.push(bookmarkData);
                
                // Add to parent folder's bookmarks if it exists
                if (parentFolder) {
                    parentFolder.bookmarks.push(bookmarkData);
                }
                
                return;
            }
            
            // It's a folder (has children or is a folder node)
            if (node.children || (!node.url && node.title)) {
                const folderName = node.title || 'Unnamed Folder';
                const currentPath = parentPath.length > 0 ? [...parentPath, folderName] : [folderName];
                const folderPath = currentPath.join(' > ');
                
                // Skip hidden folders (check both name and path)
                if (hiddenFolders.has(folderName) || hiddenFolders.has(folderPath)) {
                    return null; // Skip this folder and its contents
                }
                
                // Create folder data
                const folderData = {
                    name: folderName,
                    path: folderPath,
                    fullPath: currentPath,
                    bookmarks: [],
                    children: []
                };
                
                // Add to parent or root
                if (parentFolder) {
                    parentFolder.children.push(folderData);
                } else {
                    folderTree.push(folderData);
                }
                
                // Process children if they exist
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => {
                        const result = traverse(child, currentPath, folderData, rootFolderName);
                        // If child was skipped (hidden), don't add it
                    });
                }
                
                return folderData;
            }
        }

        // Process root nodes - Chrome returns array with single root node
        // Root node contains "Bookmarks Bar" and "Other Bookmarks" as children
        if (nodes && nodes.length > 0) {
            const rootNode = nodes[0];
            if (rootNode.children && rootNode.children.length > 0) {
                rootNode.children.forEach(rootFolder => {
                    // Process "Bookmarks Bar" and "Other Bookmarks" folders
                    if (rootFolder.title === 'Bookmarks Bar' || rootFolder.title === 'Other Bookmarks') {
                        const rootFolderName = rootFolder.title;
                        // Check if root folder itself is hidden
                        if (hiddenFolders.has(rootFolderName)) {
                            return; // Skip this root folder entirely
                        }
                        if (rootFolder.children && rootFolder.children.length > 0) {
                            rootFolder.children.forEach(child => {
                                traverse(child, [], null, rootFolderName);
                            });
                        }
                    } else {
                        // Handle any other root-level folders
                        // Check if folder is hidden
                        const folderName = rootFolder.title || 'Unnamed Folder';
                        if (!hiddenFolders.has(folderName)) {
                            traverse(rootFolder, [], null, null);
                        }
                    }
                });
            }
        } else {
            console.error('[Pandorian] Invalid bookmark tree structure:', nodes);
        }
        
        // Sort folder tree recursively
        function sortFolders(folders) {
            folders.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            
            folders.forEach(folder => {
                if (folder.children.length > 0) {
                    sortFolders(folder.children);
                }
                // Sort bookmarks within folder
                folder.bookmarks.sort((a, b) => {
                    return a.title.localeCompare(b.title);
                });
            });
        }
        
        sortFolders(folderTree);
        
        return { folderTree, flatBookmarks };
    }

    /**
     * Filter bookmarks by search query and hidden status
     */
    function filterBookmarks(bookmarks, query) {
        // First filter out hidden bookmarks
        let filtered = bookmarks.filter(bookmark => !hiddenBookmarks.has(bookmark.id));
        
        // Then apply search query if provided
        if (query && query.trim()) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(bookmark => {
                const titleMatch = bookmark.title.toLowerCase().includes(lowerQuery);
                const urlMatch = bookmark.url.toLowerCase().includes(lowerQuery);
                return titleMatch || urlMatch;
            });
        }
        
        return filtered;
    }

    /**
     * Render bookmarks with nested folder support
     */
    function renderBookmarks(bookmarksToRender) {
        if (!elements.bookmarksContainer) return;
        
        elements.bookmarksContainer.innerHTML = '';
        
        if (bookmarksToRender.length === 0) {
            elements.bookmarksContainer.innerHTML = `
                <div class="bookmark-empty">
                    ${searchQuery ? 'No bookmarks match your search.' : 'No bookmarks found.'}
                </div>
            `;
            elements.bookmarkCount.textContent = '0 bookmarks';
            
            // Add "Add Bookmark" placeholder even when empty (only when not searching)
            if (!searchQuery) {
                const addBookmarkPlaceholder = createAddBookmarkPlaceholder();
                elements.bookmarksContainer.appendChild(addBookmarkPlaceholder);
            }
            
            applyBookmarkSettings();
            return;
        }

        const totalCount = allBookmarks.length;
        elements.bookmarkCount.textContent = `${totalCount} bookmark${totalCount !== 1 ? 's' : ''}`;

        if (searchQuery) {
            // When searching, show flat list grouped by folder path
            const grouped = {};
            bookmarksToRender.forEach(bookmark => {
                const folder = bookmark.folder || 'Other Bookmarks';
                if (!grouped[folder]) {
                    grouped[folder] = [];
                }
                grouped[folder].push(bookmark);
            });

            const folders = Object.keys(grouped).sort();
            folders.forEach(folderName => {
                const folderWrapper = createFolderHeader(folderName, grouped[folderName], 0);
                const content = folderWrapper.querySelector('.folder-content');
                
                grouped[folderName].forEach(bookmark => {
                    const item = createBookmarkItem(bookmark);
                    content.appendChild(item);
                });
                
                elements.bookmarksContainer.appendChild(folderWrapper);
            });
        } else {
            // Normal view: render nested folder structure
            if (bookmarkFolderTree && bookmarkFolderTree.length > 0) {
                // Use stored tree structure
                bookmarkFolderTree.forEach(folderData => {
                    renderFolderRecursive(folderData, 0);
                });
            } else {
                // Fallback: group by folder path
                const grouped = {};
                bookmarksToRender.forEach(bookmark => {
                    const folder = bookmark.folder || 'Other Bookmarks';
                    if (!grouped[folder]) {
                        grouped[folder] = [];
                    }
                    grouped[folder].push(bookmark);
                });

                const folders = Object.keys(grouped).sort();
                folders.forEach(folderName => {
                    // Skip hidden folders
                    if (hiddenFolders.has(folderName)) {
                        return;
                    }
                    
                    const folderWrapper = createFolderHeader(folderName, grouped[folderName], 0);
                    const content = folderWrapper.querySelector('.folder-content');
                    
                    grouped[folderName].forEach(bookmark => {
                        const item = createBookmarkItem(bookmark);
                        content.appendChild(item);
                    });
                    
                    elements.bookmarksContainer.appendChild(folderWrapper);
                });
            }
        }
        
        // Add "Add Bookmark" placeholder at the bottom (only when not searching)
        if (!searchQuery) {
            const addBookmarkPlaceholder = createAddBookmarkPlaceholder();
            elements.bookmarksContainer.appendChild(addBookmarkPlaceholder);
        }
        
        // Apply settings after rendering
        applyBookmarkSettings();
    }

    /**
     * Create "Add Bookmark" placeholder
     */
    function createAddBookmarkPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'add-bookmark-placeholder';
        placeholder.setAttribute('tabindex', '0');
        
        placeholder.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Bookmark</span>
        `;
        
        placeholder.addEventListener('click', () => {
            addCurrentPageBookmark();
        });
        
        placeholder.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addCurrentPageBookmark();
            }
        });
        
        return placeholder;
    }

    /**
     * Find or create Pandorian folder in Bookmarks Bar
     */
    function getOrCreatePandorianFolder(callback) {
        chrome.bookmarks.getTree((tree) => {
            if (chrome.runtime.lastError) {
                console.error('[Pandorian] Failed to get bookmarks tree:', chrome.runtime.lastError);
                callback(null);
                return;
            }

            // Chrome bookmark tree structure: root node (id: "0") contains "Bookmarks Bar" and "Other Bookmarks"
            let bookmarksBarId = null;
            
            // Navigate through the tree structure
            if (tree && tree.length > 0) {
                const rootNode = tree[0]; // Root node
                if (rootNode.children && rootNode.children.length > 0) {
                    // Find "Bookmarks Bar" in root children
                    for (const child of rootNode.children) {
                        if (child.title === 'Bookmarks Bar' && !child.url) {
                            bookmarksBarId = child.id;
                            break;
                        }
                    }
                }
            }

            if (!bookmarksBarId) {
                console.error('[Pandorian] Could not find Bookmarks Bar. Tree structure:', tree);
                callback(null);
                return;
            }

            console.log('[Pandorian] Found Bookmarks Bar with ID:', bookmarksBarId);

            // Check if Pandorian folder exists
            chrome.bookmarks.getChildren(bookmarksBarId, (children) => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to get Bookmarks Bar children:', chrome.runtime.lastError);
                    callback(null);
                    return;
                }

                const pandorianFolder = children.find(child => child.title === 'Pandorian' && !child.url);
                
                if (pandorianFolder) {
                    // Folder exists, return its ID
                    console.log('[Pandorian] Found existing Pandorian folder:', pandorianFolder.id);
                    callback(pandorianFolder.id);
                } else {
                    // Create Pandorian folder
                    console.log('[Pandorian] Creating new Pandorian folder in Bookmarks Bar');
                    chrome.bookmarks.create({
                        parentId: bookmarksBarId,
                        title: 'Pandorian'
                    }, (folder) => {
                        if (chrome.runtime.lastError) {
                            console.error('[Pandorian] Failed to create Pandorian folder:', chrome.runtime.lastError);
                            callback(null);
                            return;
                        }
                        console.log('[Pandorian] Created Pandorian folder:', folder.id);
                        callback(folder.id);
                    });
                }
            });
        });
    }

    /**
     * Add current page as bookmark
     */
    function addCurrentPageBookmark() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].url) {
                showToast('Unable to get current page URL', 'error');
                return;
            }

            const url = tabs[0].url;
            const title = tabs[0].title || url;

            // Check if bookmark already exists
            const existing = allBookmarks.find(b => b.url === url);
            if (existing) {
                showToast('This page is already bookmarked', 'info');
                return;
            }

            // Get or create Pandorian folder, then add bookmark
            getOrCreatePandorianFolder((pandorianFolderId) => {
                if (!pandorianFolderId) {
                    console.error('[Pandorian] Could not get Pandorian folder ID, falling back to Bookmarks Bar');
                    // Fallback: try to find Bookmarks Bar and add there
                    chrome.bookmarks.getTree((tree) => {
                        let bookmarksBarId = null;
                        if (tree && tree.length > 0 && tree[0].children) {
                            for (const child of tree[0].children) {
                                if (child.title === 'Bookmarks Bar' && !child.url) {
                                    bookmarksBarId = child.id;
                                    break;
                                }
                            }
                        }
                        
                        if (bookmarksBarId) {
                            chrome.bookmarks.create({
                                parentId: bookmarksBarId,
                                title: title,
                                url: url
                            }, (bookmark) => {
                                if (chrome.runtime.lastError) {
                                    console.error('[Pandorian] Failed to create bookmark:', chrome.runtime.lastError);
                                    showToast('Failed to bookmark page', 'error');
                                    return;
                                }
                                showToast('Page bookmarked (folder creation failed)', 'info');
                            });
                        } else {
                            // Last resort: create without parentId (will go to Other Bookmarks)
                            chrome.bookmarks.create({
                                title: title,
                                url: url
                            }, (bookmark) => {
                                if (chrome.runtime.lastError) {
                                    console.error('[Pandorian] Failed to create bookmark:', chrome.runtime.lastError);
                                    showToast('Failed to bookmark page', 'error');
                                    return;
                                }
                                showToast('Page bookmarked', 'success');
                            });
                        }
                    });
                    return;
                }

                // Create bookmark in Pandorian folder
                console.log('[Pandorian] Creating bookmark in Pandorian folder:', pandorianFolderId);
                chrome.bookmarks.create({
                    parentId: pandorianFolderId,
                    title: title,
                    url: url
                }, (bookmark) => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to create bookmark:', chrome.runtime.lastError);
                        showToast('Failed to bookmark page', 'error');
                        return;
                    }

                    console.log('[Pandorian] Successfully created bookmark:', bookmark.id);
                    showToast('Page bookmarked in Pandorian folder', 'success');
                    // Bookmarks will reload automatically via listener
                });
            });
        });
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `bookmark-toast bookmark-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Filter hidden bookmarks and folders from folder tree
     */
    function filterHiddenFromTree(folderTree) {
        if (!folderTree || !Array.isArray(folderTree)) {
            return [];
        }
        
        // Ensure hiddenBookmarks and hiddenFolders are Sets
        if (!(hiddenBookmarks instanceof Set)) {
            hiddenBookmarks = new Set();
        }
        if (!(hiddenFolders instanceof Set)) {
            hiddenFolders = new Set();
        }
        
        return folderTree.map(folder => {
            if (!folder) return null;
            
            // Skip hidden folders (check both name and path)
            if (hiddenFolders.has(folder.name) || hiddenFolders.has(folder.path)) {
                return null;
            }
            
            const filteredBookmarks = (folder.bookmarks || []).filter(b => b && !hiddenBookmarks.has(b.id));
            const filteredChildren = folder.children && Array.isArray(folder.children) 
                ? filterHiddenFromTree(folder.children) 
                : [];
            
            return {
                ...folder,
                bookmarks: filteredBookmarks,
                children: filteredChildren
            };
        }).filter(folder => folder && (folder.bookmarks.length > 0 || folder.children.length > 0));
    }

    /**
     * Render folder recursively (for nested folders)
     */
    function renderFolderRecursive(folderData, depth = 0) {
        // Filter out hidden bookmarks
        const visibleBookmarks = folderData.bookmarks.filter(b => !hiddenBookmarks.has(b.id));
        
        if (visibleBookmarks.length === 0 && (!folderData.children || folderData.children.length === 0)) {
            return null; // Skip empty folders
        }
        
        const folderWrapper = createFolderHeader(folderData.path, visibleBookmarks, depth);
        const content = folderWrapper.querySelector('.folder-content');
        
        // Render bookmarks in this folder
        visibleBookmarks.forEach(bookmark => {
            const item = createBookmarkItem(bookmark);
            content.appendChild(item);
        });
        
        // Render nested folders
        if (folderData.children && folderData.children.length > 0) {
            folderData.children.forEach(childFolder => {
                const nestedFolder = renderFolderRecursive(childFolder, depth + 1);
                if (nestedFolder) {
                    content.appendChild(nestedFolder);
                }
            });
        }
        
        elements.bookmarksContainer.appendChild(folderWrapper);
        return folderWrapper;
    }

    /**
     * Handle search input
     */
    function handleSearch(e) {
        searchQuery = e.target.value.trim();
        
        if (searchQuery) {
            elements.clearSearchBtn.style.display = 'flex';
            filteredBookmarks = filterBookmarks(allBookmarks, searchQuery);
            renderBookmarks(filteredBookmarks);
        } else {
            elements.clearSearchBtn.style.display = 'none';
            filteredBookmarks = allBookmarks;
            renderBookmarks(allBookmarks);
        }
    }

    /**
     * Clear search
     */
    function clearSearch() {
        elements.bookmarkSearchInput.value = '';
        searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        filteredBookmarks = allBookmarks;
        renderBookmarks(allBookmarks);
        elements.bookmarkSearchInput.focus();
    }

    /**
     * Show settings - redirect to options page
     */
    function showSettings() {
        chrome.runtime.openOptionsPage();
    }

    /**
     * Load bookmarks
     */
    function loadBookmarks() {
        if (!elements.bookmarksContainer) return;
        
        // Check if extension context is still valid
        if (!chrome || !chrome.bookmarks || !chrome.storage) {
            console.error('[Pandorian] Extension context invalidated');
            elements.bookmarksContainer.innerHTML = '<div class="bookmark-empty">Extension was reloaded. Please refresh the page.</div>';
            return;
        }
        
        elements.bookmarksContainer.innerHTML = '<div class="bookmark-empty">Loading bookmarks...</div>';
        
        try {
            // Load hidden folders first so organizeBookmarks can use them
            chrome.storage.sync.get(['hiddenFolders'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[Pandorian] Failed to load hidden folders:', chrome.runtime.lastError);
                    hiddenFolders = new Set();
                } else {
                    hiddenFolders = new Set(result.hiddenFolders || []);
                }
                
                // Now load bookmarks
                chrome.bookmarks.getTree((bookmarkTreeNodes) => {
                    if (chrome.runtime.lastError) {
                        console.error('[Pandorian] Failed to load bookmarks:', chrome.runtime.lastError);
                        elements.bookmarksContainer.innerHTML = '<div class="bookmark-empty">Failed to load bookmarks</div>';
                        return;
                    }

                    try {
                        const organized = organizeBookmarks(bookmarkTreeNodes);
                        allBookmarks = organized.flatBookmarks || [];
                        
                        // Load hidden bookmarks (hiddenFolders already loaded above)
                        chrome.storage.sync.get(['hiddenBookmarks'], (result) => {
                        if (chrome.runtime.lastError) {
                            console.error('[Pandorian] Failed to load hidden bookmarks:', chrome.runtime.lastError);
                            hiddenBookmarks = new Set();
                        } else {
                            hiddenBookmarks = new Set(result.hiddenBookmarks || []);
                        }
                        
                        // Filter out hidden bookmarks
                        filteredBookmarks = filterBookmarks(allBookmarks, '');
                        
                        // Store folder tree for rendering (also filter hidden bookmarks and folders from tree)
                        try {
                            bookmarkFolderTree = filterHiddenFromTree(organized.folderTree || []);
                        } catch (error) {
                            console.error('[Pandorian] Error filtering folder tree:', error);
                            bookmarkFolderTree = organized.folderTree || [];
                        }
                        
                        // Debug logging
                        console.log('[Pandorian] Loaded bookmarks:', allBookmarks.length);
                        console.log('[Pandorian] Hidden bookmarks:', hiddenBookmarks.size);
                        console.log('[Pandorian] Visible bookmarks:', filteredBookmarks.length);
                        console.log('[Pandorian] Folder tree:', bookmarkFolderTree.length);
                        if (allBookmarks.length === 0) {
                            console.warn('[Pandorian] No bookmarks found. Tree structure:', bookmarkTreeNodes);
                        }
                    
                        // Auto-collapse all folders if setting is enabled and not searching
                        chrome.storage.sync.get(['bookmarkFoldersCollapsedByDefault'], (result) => {
                            const autoCollapse = result.bookmarkFoldersCollapsedByDefault !== false;
                            if (autoCollapse && !searchQuery) {
                                // Get all unique folder paths
                                const allFolders = new Set();
                                allBookmarks.forEach(bookmark => {
                                    allFolders.add(bookmark.folder || 'Other Bookmarks');
                                });
                                // Also get nested folders from tree
                                function collectFolders(folderTree) {
                                    folderTree.forEach(folder => {
                                        allFolders.add(folder.path);
                                        if (folder.children) {
                                            collectFolders(folder.children);
                                        }
                                    });
                                }
                                if (organized.folderTree) {
                                    collectFolders(organized.folderTree);
                                }
                                // Collapse all folders
                                collapsedFolders = new Set(allFolders);
                                chrome.storage.sync.set({ collapsedBookmarkFolders: Array.from(collapsedFolders) }, () => {});
                            }
                            renderBookmarks(allBookmarks);
                        });
                    }); // Close hiddenBookmarks callback
                } catch (error) {
                    console.error('[Pandorian] Error in bookmark tree callback:', error);
                    elements.bookmarksContainer.innerHTML = '<div class="bookmark-empty">Failed to load bookmarks</div>';
                }
            }); // Close bookmarkTreeNodes callback
        }); // Close hiddenFolders callback
        } catch (error) {
            console.error('[Pandorian] Extension context invalidated:', error);
            elements.bookmarksContainer.innerHTML = '<div class="bookmark-empty">Extension was reloaded. Please refresh the page.</div>';
        }
    }

    /**
     * Apply bookmark settings to UI
     */
    function applyBookmarkSettings() {
        // Apply sidebar width
        const sidebar = document.getElementById('pandorian-bookmark-sidebar');
        if (sidebar) {
            sidebar.style.width = `${bookmarkSettings.sidebarWidth}px`;
        }

        // Apply show count
        if (elements.bookmarkCount) {
            elements.bookmarkCount.style.display = bookmarkSettings.showCount ? 'block' : 'none';
        }

        // Apply drag & drop
        const bookmarkItems = document.querySelectorAll('.bookmark-item');
        bookmarkItems.forEach(item => {
            item.setAttribute('draggable', bookmarkSettings.enableDragDrop ? 'true' : 'false');
        });

        const folderHeaders = document.querySelectorAll('.bookmark-folder');
        folderHeaders.forEach(header => {
            header.setAttribute('draggable', bookmarkSettings.enableDragDrop ? 'true' : 'false');
        });

        // Apply show search
        const searchBar = document.querySelector('.sidebar-search');
        if (searchBar) {
            searchBar.style.display = bookmarkSettings.showSearch ? 'flex' : 'none';
        }

        // Apply compact mode
        if (bookmarkSettings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
    }

    /**
     * Apply theme to sidebar
     */
    function applyTheme() {
        const themes = {
            black: { bgColor: '#141414', textColor: '#ffffff', mutedColor: '#a3a3a3' },
            white: { bgColor: '#ffffff', textColor: '#000000', mutedColor: '#666666' }
        };

        // Get theme (default to black)
        const theme = themes[bookmarkTheme] || themes.black;
        const bgOpacity = bookmarkSettings.bgOpacity;
        
        // Get accent color (use custom accent if set, otherwise default purple)
        const accentColor = bookmarkSettings.accentColor || '#8b5cf6';
        const rgb = hexToRgb(accentColor);

        // Apply CSS variables
        const root = document.documentElement;
        root.style.setProperty('--bookmark-accent', accentColor);
        root.style.setProperty('--bookmark-accent-rgb', rgb);
        root.style.setProperty('--bookmark-bg-opacity', bgOpacity);
        root.style.setProperty('--bookmark-bg-color', theme.bgColor);
        root.style.setProperty('--bookmark-text-color', theme.textColor);
        root.style.setProperty('--bookmark-muted-color', theme.mutedColor);

        // Update sidebar background
        const sidebar = document.getElementById('pandorian-bookmark-sidebar');
        if (sidebar) {
            if (bookmarkTheme === 'white') {
                sidebar.style.backgroundColor = `rgba(255, 255, 255, ${bgOpacity})`;
                sidebar.style.color = theme.textColor;
            } else {
                sidebar.style.backgroundColor = `rgba(20, 20, 20, ${bgOpacity})`;
                sidebar.style.color = theme.textColor;
            }
        }

        // Update header background
        const header = document.querySelector('.sidebar-header');
        if (header) {
            header.style.background = `rgba(${rgb}, 0.05)`;
        }

        // Update search bar styling based on theme
        const searchBar = document.querySelector('.sidebar-search');
        if (searchBar) {
            if (bookmarkTheme === 'white') {
                searchBar.style.backgroundColor = '#f5f5f5';
                searchBar.style.borderBottomColor = '#e0e0e0';
                const searchInput = searchBar.querySelector('input');
                if (searchInput) {
                    searchInput.style.color = '#000000';
                    searchInput.style.backgroundColor = '#f5f5f5';
                }
                const searchSvgs = searchBar.querySelectorAll('svg');
                searchSvgs.forEach(svg => {
                    svg.style.color = '#666666';
                });
                const clearBtn = searchBar.querySelector('.clear-search-btn');
                if (clearBtn) {
                    clearBtn.style.color = '#666666';
                }
            } else {
                searchBar.style.backgroundColor = 'transparent';
                searchBar.style.borderBottomColor = 'var(--border-color)';
                const searchInput = searchBar.querySelector('input');
                if (searchInput) {
                    searchInput.style.color = 'var(--text-main)';
                    searchInput.style.backgroundColor = 'transparent';
                }
                const searchSvgs = searchBar.querySelectorAll('svg');
                searchSvgs.forEach(svg => {
                    svg.style.color = 'var(--text-muted)';
                });
                const clearBtn = searchBar.querySelector('.clear-search-btn');
                if (clearBtn) {
                    clearBtn.style.color = 'var(--text-muted)';
                }
            }
        }

        // Update hover colors and accents
        const style = document.createElement('style');
        style.id = 'bookmark-theme-styles';
        style.textContent = `
            #pandorian-bookmark-sidebar {
                background-color: ${theme.bgColor} !important;
                color: ${theme.textColor} !important;
            }
            .bookmark-item:hover {
                border-left-color: ${accentColor} !important;
            }
            .bookmark-item.active {
                background: rgba(${rgb}, 0.15) !important;
                border-left-color: ${accentColor} !important;
            }
            .bookmark-folder:hover {
                color: ${accentColor} !important;
            }
            .bookmark-item mark {
                background: rgba(${rgb}, 0.3) !important;
            }
            .bookmark-settings-btn:hover {
                color: ${accentColor} !important;
            }
            #bookmarkCount:hover {
                color: ${accentColor} !important;
            }
            .add-bookmark-placeholder:hover {
                border-color: ${accentColor} !important;
                background: rgba(${rgb}, 0.1) !important;
                color: ${accentColor} !important;
            }
            .add-bookmark-placeholder:focus {
                outline-color: ${accentColor} !important;
            }
            .bookmark-title {
                color: ${theme.textColor} !important;
            }
            .bookmark-url {
                color: ${theme.mutedColor} !important;
            }
            .bookmark-folder {
                color: ${theme.mutedColor} !important;
            }
            .sidebar-header h2 {
                color: ${theme.textColor} !important;
            }
            .sidebar-header p {
                color: ${theme.mutedColor} !important;
            }
        `;
        
        // Remove old style if exists
        const oldStyle = document.getElementById('bookmark-theme-styles');
        if (oldStyle) oldStyle.remove();
        
        document.head.appendChild(style);
    }

    /**
     * Convert hex color to RGB
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '139, 92, 246';
    }

    /**
     * Debounce function
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
     * Initialize
     */
    function init() {
        // Load all bookmark settings
        chrome.storage.sync.get([
            'collapsedBookmarkFolders',
            'bookmarkTheme',
            'bookmarkFoldersCollapsedByDefault',
            'bookmarkShowCount',
            'bookmarkEnableDragDrop',
            'bookmarkShowSearch',
            'bookmarkCompactMode',
            'bookmarkAccentColor',
            'hiddenBookmarks'
        ], (result) => {
            // Load collapsed folders state - default to all collapsed
            if (result.bookmarkFoldersCollapsedByDefault !== false) {
                // Default: all folders collapsed
                if (result.collapsedBookmarkFolders) {
                    collapsedFolders = new Set(result.collapsedBookmarkFolders);
                } else {
                    // Set all folders as collapsed by default
                    collapsedFolders = new Set();
                }
            } else {
                // User disabled auto-collapse
                if (result.collapsedBookmarkFolders) {
                    collapsedFolders = new Set(result.collapsedBookmarkFolders);
                }
            }
            
            // Load other settings
            bookmarkTheme = result.bookmarkTheme || 'black';
            bookmarkSettings.sidebarWidth = 260; // Fixed width
            bookmarkSettings.showCount = result.bookmarkShowCount !== false;
            bookmarkSettings.enableDragDrop = result.bookmarkEnableDragDrop !== false;
            bookmarkSettings.showSearch = result.bookmarkShowSearch !== false;
            bookmarkSettings.compactMode = result.bookmarkCompactMode === true;
            bookmarkSettings.accentColor = result.bookmarkAccentColor || '#8b5cf6';
            bookmarkSettings.bgOpacity = 1; // Fixed opacity
            
            // Load hidden bookmarks and folders
            hiddenBookmarks = new Set(result.hiddenBookmarks || []);
            hiddenFolders = new Set(result.hiddenFolders || []);
            
            // Apply settings
            applyBookmarkSettings();
            applyTheme();
        });

        // Listen for settings changes
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                if (changes.bookmarkShowCount !== undefined) {
                    bookmarkSettings.showCount = changes.bookmarkShowCount.newValue !== false;
                    applyBookmarkSettings();
                }
                if (changes.bookmarkEnableDragDrop !== undefined) {
                    bookmarkSettings.enableDragDrop = changes.bookmarkEnableDragDrop.newValue !== false;
                    applyBookmarkSettings();
                }
                if (changes.bookmarkShowSearch !== undefined) {
                    bookmarkSettings.showSearch = changes.bookmarkShowSearch.newValue !== false;
                    applyBookmarkSettings();
                }
                if (changes.bookmarkCompactMode !== undefined) {
                    bookmarkSettings.compactMode = changes.bookmarkCompactMode.newValue === true;
                    applyBookmarkSettings();
                }
                if (changes.bookmarkTheme) {
                    bookmarkTheme = changes.bookmarkTheme.newValue || 'black';
                    applyTheme();
                }
                if (changes.bookmarkAccentColor) {
                    bookmarkSettings.accentColor = changes.bookmarkAccentColor.newValue || '#8b5cf6';
                    applyTheme();
                }
                if (changes.hiddenBookmarks) {
                    hiddenBookmarks = new Set(changes.hiddenBookmarks.newValue || []);
                    loadBookmarks(); // Reload to update display
                }
                if (changes.hiddenFolders) {
                    hiddenFolders = new Set(changes.hiddenFolders.newValue || []);
                    loadBookmarks(); // Reload to update display
                }
            }
        });

        // Search input handler
        if (elements.bookmarkSearchInput) {
            elements.bookmarkSearchInput.addEventListener('input', debounce(handleSearch, 200));
        }

        // Clear search button
        if (elements.clearSearchBtn) {
            elements.clearSearchBtn.addEventListener('click', clearSearch);
        }

        // Settings button - go to options page
        if (elements.bookmarkSettingsBtn) {
            elements.bookmarkSettingsBtn.addEventListener('click', showSettings);
        }

        // Bookmark count click - go to options
        if (elements.bookmarkCount) {
            elements.bookmarkCount.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
        }

        // Right-click context menu
        setupContextMenu();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Focus search on Ctrl+F or Cmd+F
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (elements.bookmarkSearchInput) {
                    elements.bookmarkSearchInput.focus();
                }
            }
            // Clear search on Escape
            if (e.key === 'Escape' && searchQuery) {
                clearSearch();
            }
            // Close context menu on Escape
            if (e.key === 'Escape' && elements.sidebarContextMenu && elements.sidebarContextMenu.style.display !== 'none') {
                hideContextMenu();
            }
        });

        // Listen for messages from content script
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'pandorian-add-bookmark') {
                addCurrentPageBookmark();
            }
        });

        // Check sidebar visibility on load
        checkSidebarVisibility();

        // Load bookmarks
        loadBookmarks();
        
        // Apply theme on initial load
        setTimeout(() => {
            applyTheme();
        }, 100);

        // Listen for bookmark changes
        chrome.bookmarks.onCreated.addListener(() => {
            loadBookmarks();
        });

        chrome.bookmarks.onRemoved.addListener(() => {
            loadBookmarks();
        });

        chrome.bookmarks.onChanged.addListener(() => {
            loadBookmarks();
        });

        chrome.bookmarks.onMoved.addListener(() => {
            loadBookmarks();
        });

        chrome.bookmarks.onChildrenReordered.addListener(() => {
            loadBookmarks();
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
