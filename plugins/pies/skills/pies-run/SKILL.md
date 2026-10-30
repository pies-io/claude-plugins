---
name: pies-run
description: Build the preview of a PIES Studio app, open the running app in the browser and open it in the Studio editor.
---

The MCP server has no build tool, so the preview build goes through PIES core.

1. Ports (Hobby): core `http://127.0.0.1:18080/core`, Studio `http://127.0.0.1:14200`. With `PIES_DESKTOP_PORT_OFFSET=N` add N to both. On Enterprise use the server URL the user gives you.
2. Trigger the preview build for the app id from `/pies-build` through core's build websocket (`wsBuild`) and wait until it reports the preview URL (a few minutes on first build).
3. Open the preview URL in the browser (`open <url>` on macOS, `start` on Windows, `xdg-open` on Linux). Tell the user to click **Sign in with PIES Studio**.
4. Open the Studio editor on the app: `<studio>/#/apps/<app id>` so the user sees the canvas.

Report the two URLs. If the build fails, show the last error lines; do not retry more than once.
