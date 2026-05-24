Safari Web Extension packaging instructions

1) Open Xcode (macOS 12+ recommended).
2) File → New → Project → choose "App" and then add a "Safari Web Extension" target or use "Safari Web Extension App" template.
3) In the newly created project, locate the "Safari Web Extension" group and replace its content with the files from this folder (copy the contents of extension/safari into the extension folder in Xcode).
4) If prompted, update the extension's "Display Name" and bundle identifier.
5) Ensure the manifest (manifest.json) is present; Safari supports most WebExtension APIs, but if you used service workers/background.js (MV3) you may need to test — Safari's MV3 support is evolving. If background service worker fails, consider converting to a background script or handle via popup messaging.
6) Run the app (select the macOS app scheme) — Safari will automatically load the web extension for testing.
7) To distribute: Product → Archive → Export a signed macOS app that includes the Safari Web Extension, or use the Developer ID and notarize as required for App Store distribution.

Notes:
- This repository provides the WebExtension source in extension/safari/.
- If any runtime APIs fail in Safari (console errors), open the extension's Background/Console in Safari’s Develop menu for debugging.
- Ask if you want me to prepare a simple Xcode project stub (.xcodeproj) — it requires macOS/Xcode tools and signing, so it is recommended to finalize packaging locally.
