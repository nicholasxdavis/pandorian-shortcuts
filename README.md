![Pandorian Header](https://raw.githubusercontent.com/nicholasxdavis/pandorian-shortcuts/img/logo.png)

# Pandorian - A Shortcut

![Pandorian Logo](https://img.shields.io/badge/Pandorian-Browser%20Extension-purple) ![Chrome](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-blue) ![License](https://img.shields.io/badge/license-MIT-green)

**The ultimate command bar for your browser. Use @tags to navigate instantly. Search any site with custom shortcuts.**

---

## Overview

Pandorian is a powerful browser extension that transforms how you search and navigate the web. Instead of manually visiting different websites, simply type `@tag` in any search engine to instantly redirect to your favorite sites.

I built this because I was tired of opening multiple tabs, copying URLs, and manually navigating to different sites just to search for something. With Pandorian, you can search Spotify, GitHub, Reddit, Amazon, or any custom site directly from Google, Bing, DuckDuckGo, or any other search engine. Just type `drake @g` to search Genius, or `react hooks @gh` to search GitHub—it's that simple.

---

## Installation

### Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store (link will be added when published).

2. Click **Add to Chrome**.

3. Confirm installation.

4. Once installed, Pandorian will be ready to use immediately with 9 pre-configured shortcuts.

### Manual Installation

If you want to install from source or use the development version:

1. Clone this repository or download the files:

   ```bash
   git clone https://github.com/nicholasxdavis/pandorian-shortcuts.git
   cd pandorian-shortcuts
   ```

2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge).

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the extension directory.

5. The extension is now installed and ready to use!

---

## Usage

### Basic Usage

1. Go to any search engine (Google, Bing, DuckDuckGo, Yahoo, Yandex, etc.).

2. Type your search query with a `@tag`:
   - `drake @g` → Searches Genius for "drake"
   - `react hooks @gh` → Searches GitHub for "react hooks"
   - `best headphones @amz` → Searches Amazon for "best headphones"
   - `python tutorial @yt` → Searches YouTube for "python tutorial"

3. Press Enter and Pandorian will instantly redirect you to the target site with your search query.

### Command Palette

Press **Ctrl+K** (or **Cmd+K** on Mac) to open the Command Palette. This lets you quickly search and activate any shortcut without typing in a search engine.

### QR Code Generation

Press **Ctrl+Q** (or **Ctrl+Shift+Q** on Mac) to instantly generate a QR code for the current page. Perfect for sharing links to your mobile device.

### Bookmark Sidebar

Hover over the left edge of any webpage to access your bookmarks in a beautiful sidebar. Press **Ctrl+V** (or **Cmd+V** on Mac) to toggle it.

### Managing Shortcuts

1. Click the Pandorian icon in your browser toolbar.

2. Click **Manage Shortcuts** to open the options page.

3. Add, edit, or delete shortcuts as needed.

4. Use the search bar to quickly find shortcuts in long lists.

5. Export your shortcuts as JSON to backup or share with others.

---

## Default Shortcuts

Pandorian comes with 9 pre-configured shortcuts:

- `@s` - Spotify
- `@g` - Genius
- `@r` - Reddit
- `@yt` - YouTube
- `@x` - X (Twitter)
- `@gh` - GitHub
- `@amz` - Amazon
- `@wiki` - Wikipedia
- `@imdb` - IMDb

You can add unlimited custom shortcuts for any website!

---

## Building

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/nicholasxdavis/pandorian-shortcuts.git
   cd pandorian-shortcuts
   ```

2. Open Chrome/Edge and navigate to `chrome://extensions/`.

3. Enable **Developer mode**.

4. Click **Load unpacked** and select the project directory.

5. Make your changes and reload the extension to test.

### Creating a Distribution Package

To create a `.zip` file for distribution:

1. Ensure all files are ready and tested.

2. Create a zip file of the entire project directory (excluding `.git`, `node_modules`, etc.).

3. The zip file can be uploaded to the Chrome Web Store or shared directly.

---

## Development

### Running in Development Mode

1. Load the extension as described in the **Manual Installation** section above.

2. Make changes to any file.

3. Go to `chrome://extensions/` and click the refresh icon on the Pandorian card.

4. Test your changes immediately.

### Code Structure

#### Background Service Worker (`background.js`)

Handles:
* URL interception and processing
* Search query extraction from various search engines
* Shortcut matching and redirection
* Omnibox integration
* Keyboard command handling
* Storage management

#### Popup (`popup.html` / `popup.js`)

Handles:
* Extension status toggle
* Quick access to options
* QR code generation
* Shortcut count display

#### Options Page (`options.html` / `options.js`)

Handles:
* Shortcut management (add, edit, delete)
* Import/Export functionality
* Bookmark sidebar settings
* Keyboard shortcuts configuration

#### Content Scripts (`content-script.js`, `bookmark-content.js`)

Handles:
* Visual indicators on search pages
* Bookmark sidebar injection
* Page interaction

#### Styling (`styles.css`)

Uses modern CSS with:
* Dark mode theme
* Responsive design
* Smooth animations
* Accessible UI components

---

<h3 align="left">Support:</h3>

<p><a href="https://www.buymeacoffee.com/galore"> <img align="left" src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" height="50" width="210" alt="galore" /></a></p><br><br>

---

## License

MIT License

Copyright (c) 2025 Blacnova Development

Permission is hereby granted, free of charge, to any person obtaining a copy

of this software and associated documentation files (the "Software"), to deal

in the Software without restriction, including without limitation the rights

to use, copy, modify, merge, publish, distribute, sublicense, and/or sell

copies of the Software, and to permit persons to whom the Software is

furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all

copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR

IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,

FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE

AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER

LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,

OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE

SOFTWARE.

---

## Star History

![Star History Chart](https://api.star-history.com/svg?repos=nicholasxdavis/pandorian-shortcuts\&type=Date)

---

**Made for developers and power users who want to navigate the web faster.**
