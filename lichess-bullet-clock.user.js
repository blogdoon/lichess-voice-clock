// ==UserScript==
// @name         Lichess Bullet Clock - Every 2 Seconds
// @namespace    https://github.com/blogdoon/lichess-voice-clock
// @version      2.0
// @description  Quickly reads the bottom clock: 58, 56, 54...
// @match        https://lichess.org/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  const MAX_SECONDS = 58;
  const SPEECH_RATE = 2;
  let enabled = false;
  let lastSecond = null;
  let lastPath = location.pathname;
  let testUntil = 0;
  let currentUtterance = null;

  function speak(text, rate = SPEECH_RATE) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice = voices.find(v => /^en\b/i.test(v.lang) && v.localService) ||
      voices.find(v => /^en\b/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.lang = voice ? voice.lang : 'en-US';
    utterance.rate = rate;
    utterance.volume = 1;
    currentUtterance = utterance;
    utterance.onerror = event => {
      if (!['interrupted', 'canceled'].includes(event.error)) {
        console.warn('[Voice Clock]', event.error);
      }
    };
    synth.speak(utterance);
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    testUntil = Date.now() + 1800;
    speak('Voice clock active', 1.5);
  }
  document.addEventListener('click', enable, { capture: true });
  document.addEventListener('keydown', enable, { capture: true });

  function getSeconds() {
    const clock = document.querySelector(
      '.round__app .rclock-bottom .time, .rclock-bottom .time, .rclock.bottom .time'
    );
    if (!clock) return null;
    const text = clock.textContent.replace(/\s/g, '').replace(/,/g, '.');
    const match = text.match(/^(\d+):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/);
    if (!match) return null;
    const fraction = match[4] ? Number('0.' + match[4]) : 0;
    const seconds = match[3] !== undefined
      ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + fraction
      : Number(match[1]) * 60 + Number(match[2]) + fraction;
    return Math.ceil(seconds);
  }

  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      lastSecond = null;
      window.speechSynthesis.cancel();
    }
    if (!enabled || Date.now() < testUntil) return;
    const seconds = getSeconds();
    if (seconds === null) { lastSecond = null; return; }
    if (seconds === lastSecond) return;
    lastSecond = seconds;
    if (seconds > 0 && seconds <= MAX_SECONDS && seconds % 2 === 0) {
      speak(String(seconds));
    }
  }, 100);
  console.info('[Voice Clock] Loaded. Click once to enable speech.');
})();
