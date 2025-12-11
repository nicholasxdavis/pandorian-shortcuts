/**
 * Pandorian Bookmark Sidebar Content Script
 * Injects hover sidebar on left side of screen
 */

(function() {
    'use strict';

    let bookmarkIndicator = null;
    let bookmarkSidebar = null;
    let bookmarkIframe = null;
    let sidebarVisible = false;
    let hoverTimeout = null;
    let sidebarPinned = false; // Track if sidebar is pinned open via click

    /**
     * Create bookmark indicator (hover trigger on left side)
     */
    function createBookmarkIndicator() {
        if (bookmarkIndicator) return bookmarkIndicator;

        // Create outer container (invisible hover zone on left edge)
        bookmarkIndicator = document.createElement('div');
        bookmarkIndicator.id = 'pandorian-bookmark-indicator';
        bookmarkIndicator.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 8px;
            height: 100vh;
            z-index: 2147483647;
            cursor: pointer;
            pointer-events: auto;
            user-select: none;
            -webkit-user-select: none;
        `;

        // Create inner black bar with icon (hidden by default, shows on hover)
        const indicatorBar = document.createElement('div');
        indicatorBar.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 28.5px;
            height: 100%;
            background: #000000;
            border-radius: 0;
            opacity: 0;
            transform: translateX(-28.5px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
        `;

        // Create bookmark icon
        const icon = document.createElement('div');
        icon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        icon.style.cssText = `
            width: 20px;
            height: 20px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        `;

        indicatorBar.appendChild(icon);
        bookmarkIndicator.appendChild(indicatorBar);

        // Show black bar on hover of left edge (but NOT the sidebar)
        bookmarkIndicator.addEventListener('mouseenter', () => {
            // Don't show black bar if sidebar is currently visible
            if (sidebarVisible) {
                return;
            }
            if (hoverTimeout) clearTimeout(hoverTimeout);
            // Show ONLY the black bar, not the sidebar
            indicatorBar.style.opacity = '1';
            indicatorBar.style.transform = 'translateX(0)';
        });

        bookmarkIndicator.addEventListener('mouseleave', () => {
            // Hide the black bar when mouse leaves (only if sidebar is not open)
            if (!sidebarVisible || !sidebarPinned) {
                indicatorBar.style.opacity = '0';
                indicatorBar.style.transform = 'translateX(-28.5px)';
            }
        });

        bookmarkIndicator.setAttribute('title', 'Click to open bookmarks');
        indicatorBar.setAttribute('title', 'Click to open bookmarks');

        // Click handler to toggle sidebar (on both container and bar)
        const handleClick = function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            
            // Toggle sidebar
            if (sidebarVisible && sidebarPinned) {
                // Close if already pinned open
                forceHideBookmarkSidebar();
            } else {
                // Hide the black bar when opening sidebar
                indicatorBar.style.opacity = '0';
                indicatorBar.style.transform = 'translateX(-28.5px)';
                // Open and pin
                sidebarPinned = true;
                showBookmarkSidebar();
            }
        };
        
        bookmarkIndicator.addEventListener('click', handleClick, true);
        indicatorBar.addEventListener('click', handleClick, true);

        // Also handle mousedown for immediate feedback
        bookmarkIndicator.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        }, true);
        indicatorBar.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        }, true);

        // Also handle hover on the bar itself to keep it visible
        indicatorBar.addEventListener('mouseenter', () => {
            // Don't show black bar if sidebar is currently visible
            if (sidebarVisible) {
                return;
            }
            if (hoverTimeout) clearTimeout(hoverTimeout);
            // Keep the black bar visible (but don't show sidebar)
            indicatorBar.style.opacity = '1';
            indicatorBar.style.transform = 'translateX(0)';
        });

        indicatorBar.addEventListener('mouseleave', (e) => {
            // Only hide bar if sidebar is not open
            if (!sidebarVisible || !sidebarPinned) {
                const relatedTarget = e.relatedTarget;
                if (!relatedTarget || 
                    (!bookmarkIndicator.contains(relatedTarget) && 
                     !bookmarkSidebar?.contains(relatedTarget))) {
                    // Hide the black bar
                    indicatorBar.style.opacity = '0';
                    indicatorBar.style.transform = 'translateX(-28.5px)';
                }
            }
        });

        document.body.appendChild(bookmarkIndicator);
        return bookmarkIndicator;
    }

    /**
     * Create bookmark sidebar iframe
     */
    function createBookmarkSidebar() {
        if (bookmarkSidebar) return bookmarkSidebar;

        bookmarkSidebar = document.createElement('div');
        bookmarkSidebar.id = 'pandorian-bookmark-sidebar-container';
        // Fixed sidebar width (responsive)
        const sidebarWidth = Math.min(260, window.innerWidth * 0.85);
        
        bookmarkSidebar.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: ${sidebarWidth}px;
            max-width: 85vw;
            height: 100vh;
            max-height: 100vh;
            background: #141414;
            border-right: 1px solid #262626;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
            z-index: 2147483646;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
            overflow: hidden;
        `;

        bookmarkIframe = document.createElement('iframe');
        bookmarkIframe.src = chrome.runtime.getURL('bookmark-sidebar.html');
        bookmarkIframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: transparent;
        `;
        bookmarkSidebar.appendChild(bookmarkIframe);

        bookmarkSidebar.addEventListener('mouseenter', () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            // Keep the black bar hidden when sidebar is open
            if (bookmarkIndicator) {
                const indicatorBar = bookmarkIndicator.querySelector('div');
                if (indicatorBar) {
                    indicatorBar.style.opacity = '0';
                    indicatorBar.style.transform = 'translateX(-28.5px)';
                }
                // Disable pointer events on indicator when sidebar is visible
                bookmarkIndicator.style.pointerEvents = 'none';
            }
        });

        bookmarkSidebar.addEventListener('mouseleave', (e) => {
            // When sidebar is pinned, don't auto-hide
            if (sidebarPinned) {
                return;
            }
            // If not pinned, hide sidebar when mouse leaves
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                const relatedTarget = e.relatedTarget;
                // Only keep open if mouse moved to indicator
                if (!relatedTarget || !bookmarkIndicator?.contains(relatedTarget)) {
                    forceHideBookmarkSidebar();
                }
            }, 150);
        });

        document.body.appendChild(bookmarkSidebar);
        return bookmarkSidebar;
    }

    /**
     * Show bookmark sidebar
     */
    function showBookmarkSidebar() {
        if (!bookmarkSidebar) createBookmarkSidebar();
        if (sidebarVisible && sidebarPinned) return; // Don't reopen if already pinned

        bookmarkSidebar.style.transform = 'translateX(0)';
        sidebarVisible = true;
        
        // Hide the black bar when sidebar is shown and disable indicator
        if (bookmarkIndicator) {
            const indicatorBar = bookmarkIndicator.querySelector('div');
            if (indicatorBar) {
                indicatorBar.style.opacity = '0';
                indicatorBar.style.transform = 'translateX(-28.5px)';
            }
            // Disable pointer events on indicator when sidebar is visible
            bookmarkIndicator.style.pointerEvents = 'none';
        }
        
        // Add overlay (only hide on click if not pinned)
        if (!document.getElementById('pandorian-sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'pandorian-sidebar-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                z-index: 2147483645;
                pointer-events: auto;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            overlay.addEventListener('click', () => {
                if (!sidebarPinned) {
                    hideBookmarkSidebar();
                } else {
                    // If pinned, clicking overlay closes it
                    forceHideBookmarkSidebar();
                }
            });
            document.body.appendChild(overlay);
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
        }
    }

    /**
     * Hide bookmark sidebar
     */
    function hideBookmarkSidebar() {
        if (!bookmarkSidebar || !sidebarVisible) return;
        if (sidebarPinned) return; // Don't hide if pinned

        bookmarkSidebar.style.transform = 'translateX(-100%)';
        sidebarVisible = false;
        sidebarPinned = false;

        // Hide the black bar and re-enable indicator
        if (bookmarkIndicator) {
            const indicatorBar = bookmarkIndicator.querySelector('div');
            if (indicatorBar) {
                indicatorBar.style.opacity = '0';
                indicatorBar.style.transform = 'translateX(-28.5px)';
            }
            // Re-enable pointer events on indicator when sidebar is closed
            bookmarkIndicator.style.pointerEvents = 'auto';
        }

        const overlay = document.getElementById('pandorian-sidebar-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    /**
     * Force hide sidebar and overlay (used when mouse leaves)
     */
    function forceHideBookmarkSidebar() {
        if (!bookmarkSidebar) return;
        
        bookmarkSidebar.style.transform = 'translateX(-100%)';
        sidebarVisible = false;
        sidebarPinned = false;

        // Hide the black bar and re-enable indicator
        if (bookmarkIndicator) {
            const indicatorBar = bookmarkIndicator.querySelector('div');
            if (indicatorBar) {
                indicatorBar.style.opacity = '0';
                indicatorBar.style.transform = 'translateX(-28.5px)';
            }
            // Re-enable pointer events on indicator when sidebar is closed
            bookmarkIndicator.style.pointerEvents = 'auto';
        }

        const overlay = document.getElementById('pandorian-sidebar-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }


    /**
     * Initialize bookmark sidebar
     */
    function initBookmarkSidebar() {
        // Wait for body to exist
        function tryInit() {
            if (!document.body) {
                setTimeout(tryInit, 50);
                return;
            }

            // Check if bookmarks are enabled and sidebar visibility
            chrome.storage.sync.get(['bookmarksEnabled', 'sidebarHiddenUntil', 'sidebarHiddenPermanent', 'sidebarHiddenWebsites'], (result) => {
                const enabled = result.bookmarksEnabled !== false; // Default to enabled
                
                // Check if sidebar should be hidden on this website
                if (result.sidebarHiddenWebsites && Array.isArray(result.sidebarHiddenWebsites)) {
                    try {
                        const currentUrl = window.location.href;
                        const url = new URL(currentUrl);
                        const hostname = url.hostname.replace('www.', '');
                        
                        if (result.sidebarHiddenWebsites.includes(hostname)) {
                            // Sidebar is hidden on this website - don't create indicator
                            return;
                        }
                    } catch (e) {
                        // If URL parsing fails, continue normally
                    }
                }
                
                // Check if sidebar should be hidden
                if (result.sidebarHiddenPermanent) {
                    // Sidebar is permanently hidden - don't create indicator
                    return;
                }
                
                if (result.sidebarHiddenUntil) {
                    const now = Date.now();
                    if (now < result.sidebarHiddenUntil) {
                        // Still hidden - don't create indicator
                        // Set timeout to show again when time expires
                        const timeLeft = result.sidebarHiddenUntil - now;
                        setTimeout(() => {
                            chrome.storage.sync.set({ sidebarHiddenUntil: null }, () => {
                                if (!bookmarkIndicator && enabled) {
                                    createBookmarkIndicator();
                                }
                            });
                        }, timeLeft);
                        return;
                    } else {
                        // Time expired - clear hide state
                        chrome.storage.sync.set({ sidebarHiddenUntil: null });
                    }
                }
                
                if (enabled) {
                    createBookmarkIndicator();
                }
            });

            // Listen for changes
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync') {
                    // Handle bookmarks enabled/disabled
                    if (changes.bookmarksEnabled) {
                        if (changes.bookmarksEnabled.newValue) {
                            if (!bookmarkIndicator && document.body) {
                                createBookmarkIndicator();
                            }
                        } else {
                            if (bookmarkIndicator) {
                                bookmarkIndicator.remove();
                                bookmarkIndicator = null;
                            }
                            hideBookmarkSidebar();
                        }
                    }
                    
                    // Handle sidebar hide/show
                    if (changes.sidebarHiddenUntil || changes.sidebarHiddenPermanent || changes.sidebarHiddenWebsites) {
                        // Check if hidden on current website
                        let hiddenOnWebsite = false;
                        if (changes.sidebarHiddenWebsites?.newValue && Array.isArray(changes.sidebarHiddenWebsites.newValue)) {
                            try {
                                const currentUrl = window.location.href;
                                const url = new URL(currentUrl);
                                const hostname = url.hostname.replace('www.', '');
                                hiddenOnWebsite = changes.sidebarHiddenWebsites.newValue.includes(hostname);
                            } catch (e) {
                                // If URL parsing fails, continue normally
                            }
                        }
                        
                        if (hiddenOnWebsite || changes.sidebarHiddenPermanent?.newValue || 
                            (changes.sidebarHiddenUntil?.newValue && Date.now() < changes.sidebarHiddenUntil.newValue)) {
                            // Hide sidebar
                            if (bookmarkIndicator) {
                                bookmarkIndicator.remove();
                                bookmarkIndicator = null;
                            }
                            hideBookmarkSidebar();
                        } else {
                            // Show sidebar if enabled
                            chrome.storage.sync.get(['bookmarksEnabled', 'sidebarHiddenWebsites'], (result) => {
                                // Double-check website hiding
                                let shouldHide = false;
                                if (result.sidebarHiddenWebsites && Array.isArray(result.sidebarHiddenWebsites)) {
                                    try {
                                        const currentUrl = window.location.href;
                                        const url = new URL(currentUrl);
                                        const hostname = url.hostname.replace('www.', '');
                                        shouldHide = result.sidebarHiddenWebsites.includes(hostname);
                                    } catch (e) {
                                        // If URL parsing fails, continue normally
                                    }
                                }
                                
                                if (!shouldHide && result.bookmarksEnabled !== false && !bookmarkIndicator && document.body) {
                                    createBookmarkIndicator();
                                }
                            });
                        }
                    }
                }
            });
            
            // Listen for messages from sidebar iframe
            window.addEventListener('message', (event) => {
                // Security: only accept messages from our extension
                if (event.data && event.data.type === 'pandorian-hide-sidebar') {
                    if (bookmarkIndicator) {
                        bookmarkIndicator.remove();
                        bookmarkIndicator = null;
                    }
                    hideBookmarkSidebar();
                    
                    // If hiding on website, don't set timeout (it's permanent for that website)
                    if (event.data.website) {
                        // Already handled in storage change listener
                        return;
                    }
                    
                    // If temporary, set timeout to show again
                    if (event.data.duration && !event.data.permanent) {
                        setTimeout(() => {
                            chrome.storage.sync.set({ sidebarHiddenUntil: null }, () => {
                                chrome.storage.sync.get(['bookmarksEnabled', 'sidebarHiddenWebsites'], (result) => {
                                    // Check if hidden on current website
                                    let hiddenOnWebsite = false;
                                    if (result.sidebarHiddenWebsites && Array.isArray(result.sidebarHiddenWebsites)) {
                                        try {
                                            const currentUrl = window.location.href;
                                            const url = new URL(currentUrl);
                                            const hostname = url.hostname.replace('www.', '');
                                            hiddenOnWebsite = result.sidebarHiddenWebsites.includes(hostname);
                                        } catch (e) {
                                            // If URL parsing fails, continue normally
                                        }
                                    }
                                    
                                    if (!hiddenOnWebsite && result.bookmarksEnabled !== false && !bookmarkIndicator && document.body) {
                                        createBookmarkIndicator();
                                    }
                                });
                            });
                        }, event.data.duration);
                    }
                }
            });
        }

        tryInit();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBookmarkSidebar);
    } else {
        initBookmarkSidebar();
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeyDown(e) {
        // Close sidebar on Escape if pinned
        if (e.key === 'Escape' && sidebarVisible && sidebarPinned) {
            forceHideBookmarkSidebar();
            return;
        }
        
        // Ctrl+V (or Cmd+V on Mac) - Toggle bookmark sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
            // Don't trigger if user is typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            
            // Check if bookmarks are enabled
            chrome.storage.sync.get(['bookmarksEnabled'], (result) => {
                if (result.bookmarksEnabled === false) {
                    return;
                }
                
                if (sidebarVisible && sidebarPinned) {
                    forceHideBookmarkSidebar();
                } else {
                    sidebarPinned = true;
                    showBookmarkSidebar();
                }
            });
            return;
        }
        
        // Ctrl+B (or Cmd+B on Mac) - Bookmark current page
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
            // Don't trigger if user is typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            
            // Check if bookmarks are enabled
            chrome.storage.sync.get(['bookmarksEnabled'], (result) => {
                if (result.bookmarksEnabled === false) {
                    return;
                }
                
                // Send message to sidebar iframe to add bookmark
                if (bookmarkIframe && bookmarkIframe.contentWindow) {
                    bookmarkIframe.contentWindow.postMessage({
                        type: 'pandorian-add-bookmark'
                    }, '*');
                } else {
                    // If sidebar not open, open it first and then add bookmark
                    sidebarPinned = true;
                    showBookmarkSidebar();
                    // Wait for iframe to load, then send message
                    setTimeout(() => {
                        if (bookmarkIframe && bookmarkIframe.contentWindow) {
                            bookmarkIframe.contentWindow.postMessage({
                                type: 'pandorian-add-bookmark'
                            }, '*');
                        }
                    }, 300);
                }
            });
            return;
        }
    }

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (bookmarkIndicator) bookmarkIndicator.remove();
        if (bookmarkSidebar) bookmarkSidebar.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });
})();

