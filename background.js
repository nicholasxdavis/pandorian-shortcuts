/**
 * Pandorian - Production-Ready Command Bar Extension
 * Intercepts search queries and redirects based on @tags
 */

const DEFAULT_SHORTCUTS = [
  { key: "s", url: "https://open.spotify.com/search/{q}", name: "Spotify" },
  { key: "g", url: "https://genius.com/search?q={q}", name: "Genius" },
  { key: "r", url: "https://www.reddit.com/search/?q={q}", name: "Reddit" },
  { key: "yt", url: "https://www.youtube.com/results?search_query={q}", name: "YouTube" },
  { key: "x", url: "https://twitter.com/search?q={q}", name: "X (Twitter)" },
  { key: "gh", url: "https://github.com/search?q={q}", name: "GitHub" },
  { key: "amz", url: "https://www.amazon.com/s?k={q}", name: "Amazon" },
  { key: "wiki", url: "https://en.wikipedia.org/wiki/Special:Search?search={q}", name: "Wikipedia" },
  { key: "imdb", url: "https://www.imdb.com/find?q={q}", name: "IMDb" }
];

// State management
let shortcutsCache = DEFAULT_SHORTCUTS;
let isEnabled = true;
let processedUrls = new Set(); // Prevent duplicate processing

// Logging utility with levels
const Logger = {
  log: (msg, ...args) => console.log(`[Pandorian] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Pandorian ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Pandorian WARN] ${msg}`, ...args)
};

/**
 * Initialize extension data
 */
function refreshData() {
  try {
    chrome.storage.sync.get(["shortcuts", "enabled"], (data) => {
      if (chrome.runtime.lastError) {
        Logger.error("Failed to load data:", chrome.runtime.lastError);
        return;
      }

      if (data.shortcuts && Array.isArray(data.shortcuts) && data.shortcuts.length > 0) {
        shortcutsCache = data.shortcuts;
      } else {
        chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS }, () => {
          if (chrome.runtime.lastError) {
            Logger.error("Failed to save default shortcuts:", chrome.runtime.lastError);
          }
        });
      }

      if (data.enabled !== undefined) {
        isEnabled = data.enabled;
      }
    });
  } catch (error) {
    Logger.error("Error in refreshData:", error);
  }
}

/**
 * Validate and sanitize URL
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
 * Extract search query from URL based on search engine
 */
function extractSearchQuery(urlObj) {
  const hostname = urlObj.hostname.toLowerCase();
  
  // Google, Bing, Ecosia, DuckDuckGo
  if (hostname.includes("google") || hostname.includes("bing") || 
      hostname.includes("ecosia") || hostname.includes("duckduckgo")) {
    return urlObj.searchParams.get("q") || urlObj.searchParams.get("query");
  }
  
  // Yahoo
  if (hostname.includes("yahoo")) {
    return urlObj.searchParams.get("p");
  }
  
  // Yandex
  if (hostname.includes("yandex")) {
    return urlObj.searchParams.get("text");
  }
  
  // Baidu
  if (hostname.includes("baidu")) {
    return urlObj.searchParams.get("wd");
  }
  
  return null;
}

/**
 * Check if URL is a search engine query
 */
function isSearchEngineUrl(urlString) {
  const searchParams = ['q=', 'query=', 'p=', 'text=', 'wd=', 'search_query='];
  return searchParams.some(param => urlString.includes(param));
}

/**
 * Process URL and redirect if @tag is found
 */
function processUrl(tabId, urlString) {
  // Early returns for performance
  if (!isEnabled) return;
  if (!urlString || !urlString.startsWith('http')) return;
  if (!isSearchEngineUrl(urlString)) return;
  
  // Prevent duplicate processing
  const urlKey = `${tabId}-${urlString}`;
  if (processedUrls.has(urlKey)) return;
  processedUrls.add(urlKey);
  
  // Clean up old entries (prevent memory leak)
  if (processedUrls.size > 1000) {
    processedUrls.clear();
  }

  try {
    const urlObj = new URL(urlString);
    const rawQuery = extractSearchQuery(urlObj);
    
    if (!rawQuery) return;

    // Normalize query: decode URI and replace + with spaces
    let cleanString;
    try {
      cleanString = decodeURIComponent(rawQuery.replace(/\+/g, ' '));
    } catch (e) {
      // Fallback if decode fails
      cleanString = rawQuery.replace(/\+/g, ' ');
    }
    
    // Tokenize query
    const tokens = cleanString.split(/\s+/).filter(t => t.length > 0);
    
    // Find matching shortcut
    let matchedShortcut = null;
    let matchedTokenIndex = -1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.startsWith('@')) {
        const key = token.substring(1).toLowerCase().trim();
        if (key.length === 0) continue;
        
        const found = shortcutsCache.find(s => 
          s.key && s.key.toLowerCase() === key
        );
        
        if (found) {
          matchedShortcut = found;
          matchedTokenIndex = i;
          break;
        }
      }
    }

    if (!matchedShortcut) {
      // Remove from processed set if no match (allow retry)
      processedUrls.delete(urlKey);
      return;
    }

    Logger.log(`Redirecting: @${matchedShortcut.key} -> ${matchedShortcut.name}`);

    // Remove matched token and rebuild query
    tokens.splice(matchedTokenIndex, 1);
    const finalQuery = tokens.join(' ').trim();
    
    // Build final URL
    let finalUrl = matchedShortcut.url;
    if (finalUrl.includes("{q}")) {
      if (finalQuery.length === 0) {
        // Remove {q} placeholder if no query
        finalUrl = finalUrl.replace("{q}", "");
        // Clean up trailing ? or & if needed
        finalUrl = finalUrl.replace(/[?&]$/, '').replace(/\?&/, '?');
      } else {
        finalUrl = finalUrl.replace("{q}", encodeURIComponent(finalQuery));
      }
    } else {
      // If no {q} placeholder, append query as parameter
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}q=${encodeURIComponent(finalQuery)}`;
    }

    // Validate final URL before redirecting
    if (!isValidUrl(finalUrl)) {
      Logger.error("Invalid redirect URL:", finalUrl);
      processedUrls.delete(urlKey);
      return;
    }

    // Perform redirect
    chrome.tabs.update(tabId, { url: finalUrl }, (updatedTab) => {
      if (chrome.runtime.lastError) {
        Logger.error("Failed to redirect:", chrome.runtime.lastError);
      } else {
        // Track usage (optional, for analytics)
        trackUsage(matchedShortcut.key);
      }
      // Remove from processed set after redirect
      setTimeout(() => processedUrls.delete(urlKey), 1000);
    });

  } catch (error) {
    Logger.error("Error processing URL:", error, urlString);
    processedUrls.delete(urlKey);
  }
}

/**
 * Track shortcut usage (for future analytics)
 */
function trackUsage(shortcutKey) {
  try {
    chrome.storage.local.get(['usageStats'], (result) => {
      const stats = result.usageStats || {};
      stats[shortcutKey] = (stats[shortcutKey] || 0) + 1;
      stats.lastUsed = Date.now();
      chrome.storage.local.set({ usageStats: stats });
    });
  } catch (error) {
    // Silent fail for analytics
  }
}

/**
 * Get color for shortcut (for Omnibox formatting)
 */
function getShortcutColor(key) {
  const colors = {
    's': '#1DB954',      // Spotify green
    'g': '#FFFF64',      // Genius yellow
    'r': '#FF4500',      // Reddit orange
    'yt': '#FF0000',     // YouTube red
    'x': '#1DA1F2',      // X blue
    'gh': '#24292e',     // GitHub dark
    'amz': '#FF9900',    // Amazon orange
    'wiki': '#636466',   // Wikipedia gray
    'imdb': '#F5C518'    // IMDb yellow
  };
  return colors[key.toLowerCase()] || '#8b5cf6';
}

// Event Listeners

chrome.runtime.onInstalled.addListener((details) => {
  Logger.log("Extension installed/updated:", details.reason);
  refreshData();
  
  // Migrate data if needed
  if (details.reason === 'update') {
    // Future migration logic here
  }
});

chrome.runtime.onStartup.addListener(() => {
  Logger.log("Extension startup");
  refreshData();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.shortcuts) {
      const newShortcuts = changes.shortcuts.newValue;
      if (Array.isArray(newShortcuts)) {
        shortcutsCache = newShortcuts;
        Logger.log("Shortcuts updated:", newShortcuts.length);
      }
    }
    if (changes.enabled !== undefined) {
      isEnabled = changes.enabled.newValue;
      Logger.log("Extension", isEnabled ? "enabled" : "disabled");
    }
  }
});

// Navigation listeners with error handling
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Main frame only
    processUrl(details.tabId, details.url);
  }
}, { url: [{ urlMatches: '.*' }] });

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url) {
    processUrl(tabId, tab.url);
  }
});

// Omnibox suggestions (only if API is available)
if (chrome.omnibox) {
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    const query = text.toLowerCase().trim();
    
    // If query starts with @, extract the tag part
    let searchQuery = query;
    let tagQuery = '';
    
    if (query.startsWith('@')) {
      const parts = query.split(/\s+/);
      tagQuery = parts[0].substring(1); // Remove @
      searchQuery = parts.slice(1).join(' '); // Rest of query
    }
    
    // Filter shortcuts based on tag query
    let filtered = shortcutsCache;
    if (tagQuery) {
      filtered = shortcutsCache.filter(shortcut => {
        return shortcut.key.toLowerCase().includes(tagQuery) ||
               shortcut.name.toLowerCase().includes(tagQuery);
      });
    }
    
    // If no tag query but user typed @, show all shortcuts
    if (query.startsWith('@') && !tagQuery) {
      filtered = shortcutsCache;
    }

    // Create suggestions with pill-like formatting
    const suggestions = filtered.slice(0, 10).map(shortcut => {
      const searchPart = searchQuery ? ` ${searchQuery}` : '';
      return {
        content: `@${shortcut.key}${searchPart}`.trim(),
        description: `%s @${shortcut.key} → ${shortcut.name}${searchPart ? ` | Search: ${searchQuery}` : ''}`
      };
    });

    suggest(suggestions);
  });

  // Handle Omnibox selection
  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    // Extract @tag and query
    const parts = text.trim().split(/\s+/);
    const tagPart = parts.find(p => p.startsWith('@'));
    
    if (!tagPart) {
      // If no @tag, just search normally
      chrome.tabs.update({ url: `https://www.google.com/search?q=${encodeURIComponent(text)}` });
      return;
    }

    const tagKey = tagPart.substring(1).toLowerCase();
    const shortcut = shortcutsCache.find(s => s.key.toLowerCase() === tagKey);
    
    if (!shortcut) {
      // Shortcut not found, search for it
      chrome.tabs.update({ url: `https://www.google.com/search?q=${encodeURIComponent(text)}` });
      return;
    }

    // Get remaining query (everything after @tag)
    const queryParts = parts.filter(p => !p.startsWith('@'));
    const query = queryParts.join(' ').trim();

    // Build URL
    let finalUrl = shortcut.url;
    if (finalUrl.includes('{q}')) {
      if (query.length === 0) {
        finalUrl = finalUrl.replace('{q}', '');
        finalUrl = finalUrl.replace(/[?&]$/, '').replace(/\?&/, '?');
      } else {
        finalUrl = finalUrl.replace('{q}', encodeURIComponent(query));
      }
    } else {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}q=${encodeURIComponent(query)}`;
    }

    // Validate and navigate
    if (!isValidUrl(finalUrl)) {
      Logger.error("Invalid redirect URL from Omnibox:", finalUrl);
      return;
    }

    // Open based on disposition
    if (disposition === 'newForegroundTab') {
      chrome.tabs.create({ url: finalUrl });
    } else if (disposition === 'newBackgroundTab') {
      chrome.tabs.create({ url: finalUrl, active: false });
    } else {
      chrome.tabs.update({ url: finalUrl });
    }
  });

  // Set default suggestion when user types "@"
  chrome.omnibox.setDefaultSuggestion({
    description: 'Pandorian: Type @tag to search. Example: @g drake | Press Tab to see all shortcuts'
  });
} else {
  Logger.warn("Omnibox API not available");
}

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  // Check if command is enabled before executing
  chrome.storage.sync.get(['keyboardShortcutSettings'], (result) => {
    const settings = result.keyboardShortcutSettings || {
      enableQRCode: true
    };

    if (command === 'generate-qr-code') {
      if (settings.enableQRCode === false) {
        Logger.log('QR Code generator is disabled');
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0 || !tabs[0].url) {
          Logger.warn('Unable to get current page URL for QR code');
          return;
        }

        const url = tabs[0].url;
        chrome.windows.create({
          url: chrome.runtime.getURL(`qr-preview.html?url=${encodeURIComponent(url)}`),
          type: 'popup',
          width: 450,
          height: 565,
          focused: true
        });
      });
      return;
    }

    // Handle quick shortcuts (1-4)
    if (command.startsWith('quick-shortcut-')) {
      const shortcutIndex = parseInt(command.replace('quick-shortcut-', '')) - 1;
      
      chrome.storage.sync.get(['shortcuts', 'keyboardShortcuts'], (result) => {
        if (chrome.runtime.lastError) {
          Logger.error('Failed to load shortcuts for command:', chrome.runtime.lastError);
          return;
        }

        const shortcuts = result.shortcuts || [];
        const keyboardShortcuts = result.keyboardShortcuts || {};
        
        // Find shortcut assigned to this command
        const assignedShortcut = Object.entries(keyboardShortcuts).find(
          ([key, cmd]) => cmd === command
        );

        if (assignedShortcut) {
          const shortcut = shortcuts.find(s => s.key === assignedShortcut[0]);
          if (shortcut) {
            // Prompt for query
            chrome.windows.create({
              url: chrome.runtime.getURL(`command-palette.html?quick=${shortcut.key}`),
              type: 'popup',
              width: 400,
              height: 200,
              focused: true
            });
          }
        }
      });
    }

    // Handle quick shortcuts (1-4)
    if (command.startsWith('quick-shortcut-')) {
      const shortcutIndex = parseInt(command.replace('quick-shortcut-', '')) - 1;
      
      chrome.storage.sync.get(['shortcuts', 'keyboardShortcuts'], (result) => {
        if (chrome.runtime.lastError) {
          Logger.error('Failed to load shortcuts for command:', chrome.runtime.lastError);
          return;
        }

        const shortcuts = result.shortcuts || [];
        const keyboardShortcuts = result.keyboardShortcuts || {};
        
        // Find shortcut assigned to this command
        const assignedShortcut = Object.entries(keyboardShortcuts).find(
          ([key, cmd]) => cmd === command
        );

        if (assignedShortcut) {
          const shortcut = shortcuts.find(s => s.key === assignedShortcut[0]);
          if (shortcut) {
            // Prompt for query
            chrome.windows.create({
              url: chrome.runtime.getURL(`command-palette.html?quick=${shortcut.key}`),
              type: 'popup',
              width: 400,
              height: 200,
              focused: true
            });
          }
        }
      });
    }
  });
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.local.get(['usageStats'], (result) => {
      sendResponse({ stats: result.usageStats || {} });
    });
    return true; // Async response
  }
  
  if (request.action === 'clearStats') {
    chrome.storage.local.set({ usageStats: {} }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getCommands') {
    chrome.commands.getAll((commands) => {
      sendResponse({ commands });
    });
    return true;
  }

  if (request.action === 'getShortcutInfo') {
    // Get shortcut info for content script pill
    const key = request.key?.toLowerCase();
    if (key) {
      const shortcut = shortcutsCache.find(s => s.key.toLowerCase() === key);
      if (shortcut) {
        sendResponse({ 
          name: shortcut.name,
          key: shortcut.key,
          url: shortcut.url
        });
      } else {
        sendResponse(null);
      }
    } else {
      sendResponse(null);
    }
    return true; // Async response
  }
});
