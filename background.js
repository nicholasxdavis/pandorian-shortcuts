// Pandorian Core Logic v2.0 - Bulletproof Edition

const DEFAULT_SHORTCUTS = [
  { key: "s", url: "https://open.spotify.com/search/{q}", name: "Spotify" },
  { key: "g", url: "https://genius.com/search?q={q}", name: "Genius" },
  { key: "r", url: "https://www.reddit.com/search/?q={q}", name: "Reddit" },
  { key: "yt", url: "https://www.youtube.com/results?search_query={q}", name: "YouTube" },
  { key: "x", url: "https://twitter.com/search?q={q}", name: "X (Twitter)" },
  { key: "gh", url: "https://github.com/search?q={q}", name: "GitHub" },
  { key: "amz", url: "https://www.amazon.com/s?k={q}", name: "Amazon" }
];

let shortcutsCache = DEFAULT_SHORTCUTS;
let isEnabled = true;

function log(msg, ...args) {
    console.log(`[Pandorian] ${msg}`, ...args);
}

// --- DATA MANAGEMENT ---

function refreshData() {
  chrome.storage.sync.get(["shortcuts", "enabled"], (data) => {
    if (data.shortcuts) {
      shortcutsCache = data.shortcuts;
    } else {
      chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS });
    }
    if (data.enabled !== undefined) {
      isEnabled = data.enabled;
    }
  });
}

chrome.runtime.onInstalled.addListener(refreshData);
chrome.runtime.onStartup.addListener(refreshData);
refreshData();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.shortcuts) shortcutsCache = changes.shortcuts.newValue;
    if (changes.enabled) isEnabled = changes.enabled.newValue;
  }
});

// --- URL PARSING (The 100x Improvement) ---

function processUrl(tabId, urlString) {
    if (!isEnabled || !urlString.startsWith('http')) return;

    // Check if it's a search URL (simple heuristic to save performance)
    if (!urlString.includes('q=') && !urlString.includes('query=') && !urlString.includes('p=')) return;

    try {
        const urlObj = new URL(urlString);
        const h = urlObj.hostname;
        let rawQuery = null;

        // Supported Engines Logic
        if (h.includes("google") || h.includes("bing") || h.includes("ecosia") || h.includes("duckduckgo")) {
            rawQuery = urlObj.searchParams.get("q") || urlObj.searchParams.get("query");
        } else if (h.includes("yahoo")) {
            rawQuery = urlObj.searchParams.get("p");
        }

        if (!rawQuery) return;

        log("Analyzing Query:", rawQuery);

        // 1. Normalize: Replace + with space, then decode URI
        //    "drake+%40g" -> "drake @g"
        let cleanString = decodeURIComponent(rawQuery.replace(/\+/g, ' '));
        
        // 2. TOKENIZE: Split by spaces to find the @tag
        //    "drake @g" -> ["drake", "@g"]
        const tokens = cleanString.split(/\s+/); // Split by any whitespace

        let matchedShortcut = null;
        let matchedTokenIndex = -1;

        // 3. FIND MATCH
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            // Check if token matches any shortcut key (case insensitive)
            // We check if token starts with @
            if (token.startsWith('@')) {
                 const key = token.substring(1).toLowerCase(); // remove @
                 const found = shortcutsCache.find(s => s.key.toLowerCase() === key);
                 if (found) {
                     matchedShortcut = found;
                     matchedTokenIndex = i;
                     break; // Stop at first valid tag found
                 }
            }
        }

        if (matchedShortcut) {
            log(`Found Shortcut: ${matchedShortcut.name} (@${matchedShortcut.key})`);
            
            // 4. REMOVE TAG
            // Remove the specific token that triggered the match
            tokens.splice(matchedTokenIndex, 1);
            
            // Rejoin remaining text
            const finalQuery = tokens.join(' ').trim();
            
            // 5. REDIRECT
            let finalUrl = matchedShortcut.url;
            // If shortcut URL has {q}, encode remaining query
            // If query is empty (user just typed @s), handle gracefully (maybe go to home page?)
            if (finalQuery.length === 0) {
                 // Option: if {q} is at the end, just remove it? Or send empty?
                 // Let's send empty string, sites usually handle it (like search home)
                 finalUrl = finalUrl.replace("{q}", "");
            } else {
                 finalUrl = finalUrl.replace("{q}", encodeURIComponent(finalQuery));
            }

            log(`Redirecting to: ${finalUrl}`);
            chrome.tabs.update(tabId, { url: finalUrl });
        }

    } catch (e) {
        // Silent fail on parse errors
    }
}

// --- DUAL LISTENERS FOR SPEED & RELIABILITY ---

// Listener 1: webNavigation (Faster, catches it before DOM load)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) { // Main frame only
        processUrl(details.tabId, details.url);
    }
});

// Listener 2: tabs.onUpdated (Reliable fallback)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        processUrl(tabId, changeInfo.url);
    }
});
