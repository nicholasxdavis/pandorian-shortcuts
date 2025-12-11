# Pandorian - Command Bar Extension

**The ultimate command bar for your browser. Use @tags to navigate instantly.**

## 🚀 Features

### Core Functionality
- **Instant Navigation**: Type `@tag` in any search engine to redirect to your favorite sites
- **Custom Shortcuts**: Create unlimited custom shortcuts for any website
- **Smart Detection**: Works with Google, Bing, DuckDuckGo, Yahoo, Yandex, and more
- **Zero Configuration**: Works out of the box with 9 pre-configured shortcuts

### Advanced Features
- ✏️ **Edit Shortcuts**: Click edit to modify existing shortcuts
- 🔍 **Search & Filter**: Quickly find shortcuts by name, key, or URL
- 📥 **Import/Export**: Backup and share your shortcuts as JSON
- ⌨️ **Full Keyboard Support**: Complete keyboard navigation and shortcuts
- 📊 **Usage Tracking**: Track which shortcuts you use most (coming soon)

### Keyboard Shortcuts

#### Navigation
- `↑` `↓` - Navigate shortcuts list
- `Home` / `End` - Jump to first/last shortcut
- `Tab` - Navigate between form fields

#### Actions
- `Enter` - Edit selected shortcut / Save when editing
- `Delete` / `Backspace` - Delete shortcut
- `E` - Edit shortcut (when focused on item)
- `Esc` - Cancel editing / Close popup

#### Global Shortcuts
- `Ctrl+F` / `Cmd+F` - Focus search bar
- `Ctrl+N` / `Cmd+N` - Focus new shortcut form
- `Ctrl+E` / `Cmd+E` - Export shortcuts
- `Ctrl+I` / `Cmd+I` - Import shortcuts
- `Ctrl+O` / `Cmd+O` - Open options page (from popup)
- `Enter` - Submit form / Open options (from popup)

#### Form Navigation
- `Enter` - Move to next field / Submit form
- `Tab` - Navigate between fields

## 📦 Installation

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed!

## 🎯 Usage

### Basic Usage

1. Go to any search engine (Google, Bing, etc.)
2. Type your search query with a `@tag`:
   - `drake @g` → Searches Genius for "drake"
   - `react hooks @gh` → Searches GitHub for "react hooks"
   - `best headphones @amz` → Searches Amazon for "best headphones"

### Managing Shortcuts

1. Click the Pandorian icon in your browser toolbar
2. Click "Manage Shortcuts" to open the options page
3. Add, edit, or delete shortcuts as needed

### Creating a Shortcut

1. **Trigger**: The `@tag` you'll use (e.g., `g` for Genius)
2. **Name**: Display name for the shortcut
3. **URL**: Destination URL with `{q}` placeholder for the search query
   - Example: `https://genius.com/search?q={q}`

### Import/Export

- **Export**: Click "Export" to download your shortcuts as JSON
- **Import**: Click "Import" and select a JSON file to restore shortcuts

## 🎨 Default Shortcuts

- `@s` - Spotify
- `@g` - Genius
- `@r` - Reddit
- `@yt` - YouTube
- `@x` - X (Twitter)
- `@gh` - GitHub
- `@amz` - Amazon
- `@wiki` - Wikipedia
- `@imdb` - IMDb

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension API
- **Service Worker**: Background script for URL interception
- **Storage**: Chrome sync storage for cross-device sync
- **Performance**: Optimized with caching and debouncing

### Browser Support
- Chrome 88+
- Edge 88+
- Other Chromium-based browsers

## 🛠️ Development

### File Structure
```
Pandorian/
├── manifest.json      # Extension manifest
├── background.js      # Service worker (URL processing)
├── popup.html/js      # Extension popup UI
├── options.html/js    # Options/settings page
├── styles.css         # Global styles
└── img/               # Icons and assets
```

### Key Improvements (v2.0)
- ✅ Production-ready error handling
- ✅ Advanced shortcut management (edit, search, import/export)
- ✅ Better UX with toast notifications
- ✅ Responsive design
- ✅ Accessibility improvements
- ✅ Performance optimizations
- ✅ Security enhancements
- ✅ Usage tracking foundation

## 📝 License

MIT License - Feel free to use and modify as needed.

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 💡 Tips

1. **Short Keys**: Use single letters or short codes for faster typing
2. **Test First**: Use the "Test" button to verify your shortcuts work
3. **Backup**: Export your shortcuts regularly
4. **Search**: Use the search bar to quickly find shortcuts in long lists

## 🐛 Troubleshooting

- **Shortcuts not working?**: Make sure the extension is enabled in the popup
- **URL not redirecting?**: Check that your URL contains `{q}` placeholder
- **Import failed?**: Ensure your JSON file matches the expected format

## 📧 Support

For issues, feature requests, or questions, please open an issue on GitHub.

---

**Made with ❤️ for faster browsing**

