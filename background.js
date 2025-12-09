// Pandorian Core Logic
let shortcutsCache = [];
let isEnabled = true;

const DEFAULT_SHORTCUTS = [
  { key: "s", url: "https://open.spotify.com/search/{q}", name: "Spotify" },
  { key: "g", url: "https://genius.com/search?q={q}", name: "Genius" },
  { key: "r", url: "https://www.reddit.com/search/?q={q}", name: "Reddit" },
  { key: "yt", url: "https://www.youtube.com/results?search_query={q}", name: "YouTube" },
  { key: "x", url: "https://twitter.com/search?q={q}", name: "X (Twitter)" },
  { key: "gh", url: "https://github.com/search?q={q}", name: "GitHub" },
  { key: "amz", url: "https://www.amazon.com/s?k={q}", name: "Amazon" }
];

// 1. Load Data Immediately
function refreshData() {
  chrome.storage.sync.get(["shortcuts", "enabled"], (data) => {
    shortcutsCache = data.shortcuts || DEFAULT_SHORTCUTS;
    isEnabled = data.enabled !== false;
    
    // Save defaults if empty
    if (!data.shortcuts) {
      chrome.storage.sync.set({ shortcuts: DEFAULT_SHORTCUTS });
    }
  });
}

chrome.runtime.onInstalled.addListener(refreshData);
chrome.runtime.onStartup.addListener(refreshData);
refreshData();

// 2. Listen for changes to update cache instantly
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
    // Common search engines
    if (h.includes("google") || h.includes("bing") || h.includes("ecosia") || h.includes("duckduckgo")) {
      return urlObj.searchParams.get("q");
    }
    if (h.includes("yahoo")) {
      return urlObj.searchParams.get("p");
    }
  } catch (e) { return null; }
  return null;
}

// 4. Navigation Handler
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check 'url' in changeInfo (early) OR 'tab.url' (late but reliable)
  const currentUrl = changeInfo.url || tab.url;
  
  if (!currentUrl || !isEnabled || !currentUrl.startsWith('http')) return;

  // We only care about search engine URLs
  try {
    const urlObj = new URL(currentUrl);
    const query = getSearchQuery(urlObj);
    
    if (!query) return;

    // Decode: "drake%20%40g" -> "drake @g"
    // We decode twice to be safe against double encoding
    let decoded = decodeURIComponent(query);
    try { decoded = decodeURIComponent(decoded); } catch(e) {}
    
    let targetShortcut = null;
    let cleanQuery = decoded;

    // Check shortcuts
    for (const s of shortcutsCache) {
      const tag = "@" + s.key;
      
      // We look for the tag at start, end, or surrounded by spaces
      // Regex: (^|\s)@tag($|\s) -- Case Insensitive
      const regex = new RegExp(`(^|\s)${tag}($|\s)`, 'i');
      
      if (regex.test(decoded)) {
        targetShortcut = s;
        cleanQuery = decoded.replace(regex, " ").trim();
        break; 
      }
    }

    if (targetShortcut) {
      let finalUrl = targetShortcut.url;
      const encodedQuery = encodeURIComponent(cleanQuery);
      finalUrl = finalUrl.replace("{q}", encodedQuery);
      
      console.log(`[Pandorian] Redirecting to ${targetShortcut.name}`);
      chrome.tabs.update(tabId, { url: finalUrl });
    }

  } catch (e) {
    // URL parsing failed, ignore
  }
});