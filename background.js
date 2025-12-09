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

// 1. Load Data Immediately
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

  try {
    const urlObj = new URL(currentUrl);
    const rawQuery = getSearchQuery(urlObj);
    
    if (!rawQuery) return;

    // --- CRITICAL FIX ---
    // 1. Replace '+' with ' ' (Google uses + for spaces, JS regex needs spaces)
    // 2. Decode the result (Turn %40 into @)
    let cleanString = rawQuery.replace(/\+/g, ' ');
    cleanString = decodeURIComponent(cleanString);
    
    let targetShortcut = null;
    let finalQuery = cleanString;

    // Check shortcuts
    for (const s of shortcutsCache) {
      const tag = "@" + s.key;
      
      // Look for tag at start (^), end ($), or surrounded by whitespace (\s)
      const regex = new RegExp(`(^|\s)${tag}($|\s)`, 'i');
      
      if (regex.test(cleanString)) {
        targetShortcut = s;
        // Remove the tag from the query and trim whitespace
        finalQuery = cleanString.replace(regex, " ").trim();
        break; 
      }
    }

    if (targetShortcut) {
      let finalUrl = targetShortcut.url;
      const encodedQuery = encodeURIComponent(finalQuery);
      finalUrl = finalUrl.replace("{q}", encodedQuery);
      
      console.log(`[Pandorian] Redirecting to ${targetShortcut.name}`);
      chrome.tabs.update(tabId, { url: finalUrl });
    }

  } catch (e) {
    console.error("[Pandorian Error]", e);
  }
});