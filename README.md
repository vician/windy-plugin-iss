# 🛰️ Windy ISS Tracker Plugin

A [Windy.com](https://www.windy.com/) plugin to track the live position, orbital trajectory, and telemetry of the **International Space Station (ISS)** in real-time on top of global weather layers.

![ISS Tracker Screenshot](./preview.png)

## Features

- 🛰️ **Live ISS Position**: Real-time marker on the Leaflet GL map showing current coordinates.
- 🚀 **Telemetry Data**: Live altitude (km), velocity (km/h), and coordinates updated every 30 seconds via [wheretheiss.at](https://wheretheiss.at/).
- 🌐 **Orbit Trajectory**: Projected path across the globe with antimeridian (date line) handling.
- 🎯 **Viewport Controls**: One-click "Center map on ISS" button in the right-hand panel.

---

## Installation

### Manual Installation (Direct CDN URL)

1. Open [Windy.com](https://www.windy.com/).
2. Open the main menu in the **top right** corner (hamburger icon) and select **Install Windy plugin** (or navigate directly to [windy.com/plugins](https://www.windy.com/plugins)).
3. Scroll down to the manual installation input field at the bottom.
4. Paste the direct Windy CDN URL:
   ```text
   https://windy-plugins.com/1003211/windy-plugin-iss-tracker/0.1.3/plugin.min.js
   ```
5. Click **Install**.
6. The **ISS Tracker** is now installed! You can launch it from the right-side menu or access it directly at:  
   **[windy.com/plugin/iss-tracker](https://www.windy.com/plugin/iss-tracker)**

---

## Local Development

If you want to run or test the plugin locally:

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/vician/windy-plugin-iss.git
   cd windy-plugin-iss
   npm install
   ```
2. Start the development server in watch mode:
   ```bash
   npm start
   ```
3. Open [windy.com/developer-mode](https://www.windy.com/developer-mode).
4. Load the local plugin from:
   ```text
   https://localhost:9999/plugin.js
   ```

---

## Releasing a New Version

Version bumps and synchronization are handled automatically:

```bash
# 1. Bump version and sync src/pluginConfig.ts
npm version patch   # or minor / major

# 2. Push commit and tag to GitHub
git push --follow-tags
```

The GitHub Actions workflow will automatically build, package, and upload the new version to Windy.

---

## License

ISC License - see [package.json](package.json).
