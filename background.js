// Pandorian Core Logic

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

// 1. Load Data Immediately
function refreshData() {
  log("Refreshing data...");
  chrome.storage.sync.get(["shortcuts", "enabled"], (data) => {
    if (data.shortcuts) {
      shortcutsCache = data.shortcuts;
      log("Loaded shortcuts from storage:", shortcutsCache.length);
    } else {
      log("No shortcuts in storage, using defaults.");
      chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS });
    }
    if (data.enabled !== undefined) {
      isEnabled = data.enabled;
      log("Extension enabled state:", isEnabled);
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
    log("Extension Installed");
    refreshData();
});
chrome.runtime.onStartup.addListener(() => {
    log("Extension Startup");
    refreshData();
});
refreshData();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    log("Storage changed");
    if (changes.shortcuts) {
        shortcutsCache = changes.shortcuts.newValue;
        log("Shortcuts updated. New count:", shortcutsCache.length);
    }
    if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
        log("Enabled state changed:", isEnabled);
    }
  }
});

// 3. URL Parsing Logic
function getSearchQuery(urlObj) {
  try {
    const h = urlObj.hostname;
    // Handle various search engine params
    if (h.includes("google") || h.includes("bing") || h.includes("ecosia") || h.includes("duckduckgo")) {
      return urlObj.searchParams.get("q") || urlObj.searchParams.get("query");
    }
    if (h.includes("yahoo")) {
      return urlObj.searchParams.get("p");
    }
  } catch (e) { return null; }
  return null;
}

// 4. Navigation Handler
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  
  if (!currentUrl || !isEnabled || !currentUrl.startsWith('http')) return;

  // We check if it looks like a search engine URL to save processing
  if (!currentUrl.includes('q=') && !currentUrl.includes('query=') && !currentUrl.includes('p=')) {
      return;
  }

  log("Processing URL:", currentUrl);

  try {
    const urlObj = new URL(currentUrl);
    const rawQuery = getSearchQuery(urlObj);
    
    if (!rawQuery) {
        log("No query param found in search URL");
        return;
    }

    log("Raw query found:", rawQuery);

    // --- CRITICAL FIX ---
    // 1. Replace '+' with ' ' (Google uses + for spaces, JS regex needs spaces)
    // 2. Decode the result (Turn %40 into @)
    let cleanString = rawQuery.replace(/\+/g, ' ');
    cleanString = decodeURIComponent(cleanString);
    
    log("Clean string to check:", cleanString);

    let targetShortcut = null;
    let finalQuery = cleanString;

    // Check shortcuts
    for (const s of shortcutsCache) {
      const tag = "@" + s.key;
      
      // Look for tag at start (^), end ($), or surrounded by whitespace (\s)
      const regex = new RegExp(`(^|\s)${tag}($|\s)`, 'i');
      
      if (regex.test(cleanString)) {
        log(`Match Found! Tag: ${tag} (${s.name})`);
        targetShortcut = s;
        // Remove the tag from the query and trim whitespace
        finalQuery = cleanString.replace(regex, " ").trim();
        log("New query after stripping tag:", finalQuery);
        break; 
      }
    }

    if (targetShortcut) {
      let finalUrl = targetShortcut.url;
      const encodedQuery = encodeURIComponent(finalQuery);
      finalUrl = finalUrl.replace("{q}", encodedQuery);
      
      log(`Redirecting to: ${finalUrl}`);
      chrome.tabs.update(tabId, { url: finalUrl });
    } else {
        log("No matching shortcut tag found.");
    }

  } catch (e) {
    console.error("[Pandorian Error]", e);
  }
});