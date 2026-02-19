# Run the Pomodoro App Locally (with Notifications)

Opening `index.html` directly with `file://` blocks notification permission in many browsers.
Run the app through `http://localhost` instead.

## macOS / Linux
1. Open a terminal in this project folder.
2. Run:
   ```bash
   ./RUN_THIS.sh
   ```
   Or on macOS, double-click `RUN_THIS.command`.
3. Open: `http://localhost:8000/index.html`
4. Click **Enable Notifications** in the app.

## Windows
1. Double-click `RUN_THIS.bat`.
2. Open: `http://localhost:8000/index.html`
3. Click **Enable Notifications** in the app.

## Notes
- Optional custom port: `./RUN_THIS.sh 8080` (or `RUN_THIS.bat 8080`)
- Stop the server with `Ctrl+C` in the terminal window.
- Requires Python 3 installed.
