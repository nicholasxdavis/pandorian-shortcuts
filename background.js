// Pandorian Core Logic - Enhanced Edition

const DEFAULT_SHORTCUTS = [
  { key: "s", url: "https://open.spotify.com/search/{q}", name: "Spotify", category: "Music", icon: "🎵" },
  { key: "g", url: "https://genius.com/search?q={q}", name: "Genius", category: "Music", icon: "🎤" },
  { key: "r", url: "https://www.reddit.com/search/?q={q}", name: "Reddit", category: "Social", icon: "🤖" },
  { key: "yt", url: "https://www.youtube.com/results?search_query={q}", name: "YouTube", category: "Video", icon: "▶️" },
  { key: "x", url: "https://twitter.com/search?q={q}", name: "X (Twitter)", category: "Social", icon: "🐦" },
  { key: "gh", url: "https://github.com/search?q={q}", name: "GitHub", category: "Development", icon: "💻" },
  { key: "amz", url: "https://www.amazon.com/s?k={q}", name: "Amazon", category: "Shopping", icon: "🛒" }
];

let shortcutsCache = DEFAULT_SHORTCUTS;
let isEnabled = true;
let searchHistory = [];
let analytics = { totalSearches: 0, shortcutsUsed: {} };

// Fuzzy search helper
function fuzzyMatch(pattern, str) {
  pattern = pattern.toLowerCase();
  str = str.toLowerCase();
  let patternIdx = 0;
  for (let i = 0; i < str.length && patternIdx < pattern.length; i++) {
    if (str[i] === pattern[patternIdx]) patternIdx++;
  }
  return patternIdx === pattern.length;
}

function log(msg, ...args) {
    if (chrome.runtime.getManifest().version.includes('dev')) {
        console.log(`[Pandorian] ${msg}`, ...args);
    }
}

// Load data with analytics and history
function refreshData() {
  chrome.storage.sync.get(["shortcuts", "enabled", "searchHistory", "analytics"], (data) => {
    if (data.shortcuts) {
      shortcutsCache = data.shortcuts;
    } else {
      chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS });
    }
    if (data.enabled !== undefined) {
      isEnabled = data.enabled;
    }
    if (data.searchHistory) {
      searchHistory = data.searchHistory.slice(0, 50); // Keep last 50
    }
    if (data.analytics) {
      analytics = { ...analytics, ...data.analytics };
    }
  });
}

// Track analytics
function trackUsage(shortcutKey, query) {
  analytics.totalSearches++;
  analytics.shortcutsUsed[shortcutKey] = (analytics.shortcutsUsed[shortcutKey] || 0) + 1;
  
  searchHistory.unshift({
    key: shortcutKey,
    query: query.substring(0, 100),
    timestamp: Date.now()
  });
  searchHistory = searchHistory.slice(0, 50);
  
  chrome.storage.sync.set({ analytics, searchHistory });
}

chrome.runtime.onInstalled.addListener(() => {
    refreshData();
    chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS });
});

chrome.runtime.onStartup.addListener(() => {
    refreshData();
});

refreshData();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.shortcuts) {
        shortcutsCache = changes.shortcuts.newValue;
    }
    if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
    }
  }
});

// Keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-command-palette') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'openPalette' });
    });
  }
});

// Enhanced URL parsing
function getSearchQuery(urlObj) {
  try {
    const h = urlObj.hostname.toLowerCase();
    if (h.includes("google") || h.includes("bing") || h.includes("ecosia") || h.includes("duckduckgo")) {
      return urlObj.searchParams.get("q") || urlObj.searchParams.get("query");
    }
    if (h.includes("yahoo")) {
      return urlObj.searchParams.get("p");
    }
  } catch (e) { return null; }
  return null;
}

// Enhanced navigation handler with better matching
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  
  if (!currentUrl || !isEnabled || !currentUrl.startsWith('http')) return;
  if (changeInfo.status !== 'loading') return; // Only process on navigation start

  if (!currentUrl.includes('q=') && !currentUrl.includes('query=') && !currentUrl.includes('p=')) {
      return;
  }

  try {
    const urlObj = new URL(currentUrl);
    const rawQuery = getSearchQuery(urlObj);
    
    if (!rawQuery) return;

    let cleanString = rawQuery.replace(/\+/g, ' ');
    cleanString = decodeURIComponent(cleanString);

    let targetShortcut = null;
    let finalQuery = cleanString;
    let bestMatch = null;
    let bestScore = 0;

    // Try exact match first (fastest)
    for (const s of shortcutsCache) {
      const tag = "@" + s.key;
      const regex = new RegExp(`(^|\s)${tag.replace(/[.*+?^${}()|[\]\]/g, '\$&')}($|\s)`, 'i');
      
      if (regex.test(cleanString)) {
        targetShortcut = s;
        finalQuery = cleanString.replace(regex, " ").trim();
        break;
      }
      
      // Fuzzy matching for typos
      if (fuzzyMatch(s.key, cleanString) && s.key.length > bestScore) {
        bestMatch = s;
        bestScore = s.key.length;
      }
    }

    // If no exact match but fuzzy match found, use it (optional feature)
    // if (!targetShortcut && bestMatch) {
    //   targetShortcut = bestMatch;
    // }

    if (targetShortcut) {
      let finalUrl = targetShortcut.url;
      const encodedQuery = encodeURIComponent(finalQuery || " ");
      finalUrl = finalUrl.replace("{q}", encodedQuery);
      
      trackUsage(targetShortcut.key, finalQuery);
      chrome.tabs.update(tabId, { url: finalUrl });
    }

  } catch (e) {
    console.error("[Pandorian Error]", e);
  }
});

// Message handler for popup/options communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getShortcuts') {
    sendResponse({ shortcuts: shortcutsCache, enabled: isEnabled });
  } else if (request.action === 'getHistory') {
    sendResponse({ history: searchHistory.slice(0, 20) });
  } else if (request.action === 'getAnalytics') {
    sendResponse({ analytics });
  }
  return true;
});