
// ==UserScript==
// @name         Lichess Bullet Clock Voice Reader
// @namespace    https://github.com/blogdoon/lichess-voice-clock
// @version      3.0.0
// @description  Reads the Lichess bottom clock every second, including Firefox Android
// @match        https://lichess.org/*
// @match        https://lichess.dev/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.top !== window.self) return;

  const PANEL_ID = 'lichess-bullet-voice-reader-v3';
  const CHECK_INTERVAL = 100;
  const SPEECH_RATE = 3;
  const SPEECH_RESTART_DELAY = 120;

  let enabled = false;
  let lastSecond = null;
  let lastPath = location.pathname;
  let ignoreAnnouncementsUntil = 0;
  let restartTimer = null;

  let panel;
  let toggleButton;
  let testButton;
  let statusNode;

  const synth = window.speechSynthesis;

  function setStatus(message) {
    if (statusNode && statusNode.textContent !== message) {
      statusNode.textContent = message;
    }
  }

  function speechSupported() {
    return (
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    );
  }

  // Parse formats such as 9, 9.5, 0:09, 1:09 or 1:02:09.
  function parseClock(text) {
    const value = String(text || '')
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .trim();

    const match = value.match(
      /^(\d+)(?::(\d{1,2}))?(?::(\d{1,2}))?(?:\.(\d+))?$/
    );

    if (!match) return null;

    const parts = [match[1]];

    if (match[2] !== undefined) parts.push(match[2]);
    if (match[3] !== undefined) parts.push(match[3]);

    const numbers = parts.map(Number);
    const fraction = match[4]
      ? Number('0.' + match[4])
      : 0;

    let seconds;

    if (numbers.length === 3) {
      seconds =
        numbers[0] * 3600 +
        numbers[1] * 60 +
        numbers[2] +
        fraction;
    } else if (numbers.length === 2) {
      seconds =
        numbers[0] * 60 +
        numbers[1] +
        fraction;
    } else {
      seconds = numbers[0] + fraction;
    }

    return Number.isFinite(seconds)
      ? Math.max(0, Math.ceil(seconds))
      : null;
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function isBottomClock(element) {
    const clock = element.closest(
      '.rclock-bottom, .clock-bottom, .rclock'
    );

    return !!(
      element.closest('.rclock-bottom, .clock-bottom') ||
      clock?.classList.contains('rclock-bottom') ||
      clock?.classList.contains('clock-bottom')
    );
  }

  // Find the player's bottom clock, with layout fallbacks for mobile.
  function getClock() {
    const selectors = [
      '.rclock-bottom .time',
      '.rclock-bottom time',
      '.clock-bottom .time',
      '.clock-bottom time',
      '.rclock .time',
      '.rclock time',
      '.clock_white .time',
      '.clock_black .time',
      '.clock_white time',
      '.clock_black time',
      '.round__app .time',
      '.round__app time'
    ];

    const elements = Array.from(
      document.querySelectorAll(selectors.join(','))
    );

    const candidates = elements
      .filter(isVisible)
      .map(element => ({
        element,
        seconds: parseClock(element.textContent),
        rect: element.getBoundingClientRect()
      }))
      .filter(item => item.seconds !== null);

    if (!candidates.length) return null;

    // The bottom clock is preferred when Lichess exposes its class.
    const markedBottom = candidates.filter(item =>
      isBottomClock(item.element)
    );

    const choices = markedBottom.length
      ? markedBottom
      : candidates;

    // If mobile markup differs, use the lowest visible clock.
    choices.sort((a, b) => b.rect.top - a.rect.top);

    return choices[0];
  }

  // Speak a short reading. Cancel stale numbers so they do not queue.
  function speak(text, rate = SPEECH_RATE) {
    if (!speechSupported()) {
      setStatus('Speech is unavailable in this browser.');
      return;
    }

    if (restartTimer !== null) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    const utterance = new SpeechSynthesisUtterance(String(text));
    const voices = synth.getVoices();

    const voice =
      voices.find(v => /^en\b/i.test(v.lang) && v.localService) ||
      voices.find(v => /^en\b/i.test(v.lang));

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onerror = event => {
      if (
        !['interrupted', 'canceled'].includes(event.error)
      ) {
        console.warn('[Lichess Voice Clock] Speech error:', event.error);
        setStatus('Voice playback failed. Try Test voice.');
      }
    };

    const startSpeaking = () => {
      restartTimer = null;

      try {
        synth.resume();
        synth.speak(utterance);
      } catch (error) {
        console.error('[Lichess Voice Clock]', error);
        setStatus('Unable to start speech. Try Test voice.');
      }
    };

    if (synth.speaking || synth.pending) {
      synth.cancel();

      // A short delay helps avoid immediate cancel/speak conflicts.
      restartTimer = setTimeout(
        startSpeaking,
        SPEECH_RESTART_DELAY
      );
    } else {
      startSpeaking();
    }
  }

  function enableVoice() {
    if (!speechSupported()) {
      setStatus(
        'Speech is unavailable. Check Firefox and Android speech settings.'
      );
      return;
    }

    enabled = !enabled;

    toggleButton.textContent = enabled
      ? 'Pause voice'
      : 'Enable voice';

    toggleButton.setAttribute(
      'aria-pressed',
      String(enabled)
    );

    if (enabled) {
      lastSecond = null;

      // The initial message also activates speech after the user's tap.
      ignoreAnnouncementsUntil = Date.now() + 1200;

      speak('Voice clock ready', 2);

      setStatus('Voice enabled. Looking for your clock...');
    } else {
      if (restartTimer !== null) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }

      synth.cancel();

      setStatus('Voice paused.');
    }
  }

  function createPanel() {
    if (panel || !document.body) return;

    panel = document.createElement('section');
    panel.id = PANEL_ID;

    panel.innerHTML = `
      <div class="lvcr-title">Lichess Voice Clock</div>
      <button type="button" class="lvcr-toggle"
              aria-pressed="false">Enable voice</button>
      <button type="button" class="lvcr-test">Test voice</button>
      <div class="lvcr-status" role="status" aria-live="polite">
        Open a live game to detect the clock.
      </div>
      <div class="lvcr-note">
        Bullet mode: announces each changing second.
      </div>
    `;

    const style = document.createElement('style');

    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        z-index: 2147483647;
        top: 58px;
        right: 8px;
        width: 205px;
        max-width: calc(100vw - 16px);
        box-sizing: border-box;
        padding: 10px;
        border: 1px solid #777;
        border-radius: 9px;
        background: #202020;
        color: #f5f5f5;
        box-shadow: 0 3px 12px rgba(0,0,0,.35);
        font: 13px/1.4 system-ui, sans-serif;
      }

      #${PANEL_ID} * {
        box-sizing: border-box;
      }

      #${PANEL_ID} .lvcr-title {
        margin-bottom: 7px;
        font-size: 14px;
        font-weight: 700;
      }

      #${PANEL_ID} button {
        width: 100%;
        min-height: 36px;
        margin: 5px 0;
        padding: 7px;
        border: 1px solid #777;
        border-radius: 6px;
        background: #383838;
        color: white;
        font: inherit;
        cursor: pointer;
        touch-action: manipulation;
      }

      #${PANEL_ID} .lvcr-toggle[aria-pressed="true"] {
        background: #176b45;
        border-color: #58b98a;
      }

      #${PANEL_ID} .lvcr-status {
        min-height: 32px;
        overflow-wrap: anywhere;
        margin-top: 6px;
      }

      #${PANEL_ID} .lvcr-note {
        margin-top: 5px;
        font-size: 11px;
        color: #c3c3c3;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(panel);

    toggleButton = panel.querySelector('.lvcr-toggle');
    testButton = panel.querySelector('.lvcr-test');
    statusNode = panel.querySelector('.lvcr-status');

    toggleButton.addEventListener('click', enableVoice);

    testButton.addEventListener('click', () => {
      speak('Voice test. Fifty nine. Fifty eight. Fifty seven.', 2.5);
      setStatus('Playing voice test. Check your device volume.');
    });
  }

  function tick() {
    if (!document.body) return;

    if (!panel) createPanel();
    if (!panel) return;

    // Lichess can navigate between games without reloading the page.
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      lastSecond = null;
      ignoreAnnouncementsUntil = 0;

      if (restartTimer !== null) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }

      synth.cancel();
    }

    const clock = getClock();

    if (!clock) {
      lastSecond = null;

      if (enabled) {
        setStatus('Voice enabled. Waiting for a visible game clock...');
      } else {
        setStatus('Open a live game, then tap Enable voice.');
      }

      return;
    }

    if (!enabled) {
      setStatus('Clock detected. Tap Enable voice to start.');
      return;
    }

    if (Date.now() < ignoreAnnouncementsUntil) return;

    const seconds = clock.seconds;

    if (seconds <= 0) {
      lastSecond = 0;
      setStatus('Clock has reached zero.');
      return;
    }

    // Announce exactly once each time the displayed whole second changes.
    if (seconds !== lastSecond) {
      lastSecond = seconds;
      speak(String(seconds), SPEECH_RATE);

      setStatus(`Voice on. Clock: ${seconds} seconds.`);
    }
  }

  // Check frequently; announcements happen only when the time changes.
  setInterval(tick, CHECK_INTERVAL);

  console.info(
    '[Lichess Voice Clock] v3.0 loaded. Open a game and tap Enable voice.'
  );
})();
