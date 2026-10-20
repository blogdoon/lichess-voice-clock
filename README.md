# Lichess Voice Clock

Userscript that reads the bottom Lichess clock quickly at even-numbered seconds below one minute: 58, 56, 54 ... 4, 2. It does not repeat an unchanged clock value.

## Install

Install a userscript manager compatible with your browser, then open the raw userscript link:

[Install userscript](https://raw.githubusercontent.com/blogdoon/lichess-voice-clock/main/lichess-bullet-clock.user.js)

If the link displays source code instead of an installation prompt, create a new script in your userscript manager and paste the full source. Save it and disable older voice-clock scripts.

## Firefox on Android

Use the Lichess website in Firefox, not the native Lichess app. Install a userscript manager available for your Firefox Android version, then install the script using the link above or paste its source into the manager. Android compatibility has not been tested; extension availability and speech support depend on your browser and device.

Open https://lichess.org/, reload, and tap the page once. You should hear 'Voice clock active'. Keep your own clock at the bottom; flipping the board or watching a game can make it read someone else's clock.

## Settings

Edit MAX_SECONDS (default 58) and SPEECH_RATE (default 2) in the script. Speech timing depends on browser scheduling and the selected voice; exact timing is not guaranteed. In increment games, an even-numbered value may be announced again if the clock returns to it.

The script reads displayed clock text and uses browser speech synthesis. It contains no network requests of its own; speech processing depends on the selected browser voice.
