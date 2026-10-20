
function createPanel() {
  if (panel || !document.body) return;

  panel = document.createElement('section');
  panel.id = PANEL_ID;

  panel.innerHTML = `
    <button type="button" class="lvcr-mini"
      aria-label="Open voice clock controls"
      title="Voice clock controls">🔊</button>

    <div class="lvcr-content">
      <div class="lvcr-head">
        <div class="lvcr-title">Lichess Voice Clock</div>
        <button type="button" class="lvcr-minimize"
          aria-label="Minimize controls" title="Minimize">−</button>
      </div>

      <button type="button" class="lvcr-toggle"
        aria-pressed="false">Enable voice</button>

      <button type="button" class="lvcr-test">Test voice</button>

      <div class="lvcr-status" role="status" aria-live="polite">
        Open a live game to detect the clock.
      </div>

      <div class="lvcr-note">
        Bullet mode: reads each changing second.
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      z-index: 2147483647;
      right: 8px;
      bottom: 85px;
      top: auto;
      width: 205px;
      max-width: calc(100vw - 16px);
      box-sizing: border-box;
      padding: 10px;
      border: 1px solid #777;
      border-radius: 9px;
      background: #202020;
      color: #f5f5f5;
      box-shadow: 0 3px 12px #0005;
      font: 13px/1.4 system-ui, sans-serif;
    }

    #${PANEL_ID} * {
      box-sizing: border-box;
    }

    #${PANEL_ID} .lvcr-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }

    #${PANEL_ID} .lvcr-title {
      font-size: 14px;
      font-weight: 700;
    }

    #${PANEL_ID} button {
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

    #${PANEL_ID} .lvcr-content > button {
      display: block;
      width: 100%;
    }

    #${PANEL_ID} .lvcr-minimize {
      flex: 0 0 32px;
      width: 32px;
      min-height: 30px;
      margin: 0;
      padding: 2px;
      font-size: 20px;
    }

    #${PANEL_ID} .lvcr-toggle[aria-pressed="true"] {
      background: #176b45;
      border-color: #58b98a;
    }

    #${PANEL_ID} .lvcr-status {
      min-height: 30px;
      margin-top: 5px;
      overflow-wrap: anywhere;
    }

    #${PANEL_ID} .lvcr-note {
      margin-top: 5px;
      color: #c3c3c3;
      font-size: 11px;
    }

    #${PANEL_ID} .lvcr-mini {
      display: none;
      width: 42px;
      height: 42px;
      min-height: 42px;
      margin: 0;
      padding: 0;
      border: 1px solid #58b98a;
      border-radius: 50%;
      background: #176b45;
      box-shadow: 0 3px 10px #0006;
      font-size: 19px;
    }

    #${PANEL_ID}.lvcr-collapsed {
      width: 46px;
      padding: 2px;
      border: none;
      background: transparent;
      box-shadow: none;
    }

    #${PANEL_ID}.lvcr-collapsed .lvcr-content {
      display: none;
    }

    #${PANEL_ID}.lvcr-collapsed .lvcr-mini {
      display: block;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  toggleButton = panel.querySelector('.lvcr-toggle');
  testButton = panel.querySelector('.lvcr-test');
  statusNode = panel.querySelector('.lvcr-status');

  const miniButton = panel.querySelector('.lvcr-mini');
  const minimizeButton = panel.querySelector('.lvcr-minimize');

  let collapseTimer = null;

  function minimize() {
    panel.classList.add('lvcr-collapsed');
  }

  function expand() {
    if (collapseTimer !== null) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }

    panel.classList.remove('lvcr-collapsed');
  }

  miniButton.addEventListener('click', expand);
  minimizeButton.addEventListener('click', minimize);

  toggleButton.addEventListener('click', enableVoice);

  // After voice activation, shrink the controls so the board is clear.
  toggleButton.addEventListener('click', () => {
    if (collapseTimer !== null) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }

    if (enabled) {
      collapseTimer = setTimeout(() => {
        collapseTimer = null;

        if (enabled && panel) {
          minimize();
        }
      }, 1300);
    }
  });

  testButton.addEventListener('click', () => {
    speak('Voice test. Fifty nine. Fifty eight. Fifty seven.', 2.5);
    setStatus('Playing voice test. Check your device volume.');
  });

  // Start compact so the game is not blocked when it first loads.
  minimize();
}
