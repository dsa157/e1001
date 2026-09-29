/**
 * ============================================================================
 * Seeed reTerminal E1001 Master Dashboard Hub - Frontend Controller
 * Version: 2026.09.29.14.50.00
 * ============================================================================
 */

let lastActiveModuleId = null;
let maxDwellSeconds = 30;

const imgElement = document.getElementById('live-screen-img');
const countdownLabel = document.getElementById('cycle-countdown-label');
const progressFill = document.getElementById('cycle-progress-fill');
const cycleStatusBadge = document.getElementById('cycle-status-badge');
const activeModuleBadge = document.getElementById('active-module-badge');
const modulePillsList = document.getElementById('module-pills-list');

const btnPrev = document.getElementById('btn-prev');
const btnPause = document.getElementById('btn-pause');
const btnNext = document.getElementById('btn-next');
const btnRefresh = document.getElementById('btn-refresh');

/**
 * Fetch and refresh the active screen image
 */
function refreshScreenImage() {
  const timestamp = Date.now();
  imgElement.src = `/api/screen.png?t=${timestamp}`;
}

/**
 * Poll Hub Status
 */
async function pollStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();

    const active = data.activeModule;
    if (active) {
      activeModuleBadge.textContent = `Module: ${active.name || active.id}`;
      if (lastActiveModuleId !== active.id) {
        lastActiveModuleId = active.id;
        maxDwellSeconds = active.dwell_seconds || 30;
        refreshScreenImage();
      }
    }

    // Cycle Status Badge & Button
    if (data.isCyclePaused) {
      cycleStatusBadge.textContent = "Cycle Paused";
      cycleStatusBadge.className = "badge badge-paused";
      btnPause.innerHTML = '▶ Resume Cycle <kbd>GPIO3</kbd>';
    } else {
      cycleStatusBadge.textContent = "Cycling Active";
      cycleStatusBadge.className = "badge badge-active";
      btnPause.innerHTML = '⏸ Pause Cycle <kbd>GPIO3</kbd>';
    }

    // Progress Bar
    const remaining = Math.max(0, data.dwellRemaining);
    countdownLabel.innerHTML = data.isCyclePaused
      ? `Cycle paused (<strong>${active ? active.name : ''}</strong>)`
      : `Next screen in: <strong>${remaining}s</strong>`;

    const pct = Math.max(0, Math.min(100, (remaining / maxDwellSeconds) * 100));
    progressFill.style.width = `${pct}%`;

    // Render Module Pills
    renderModulePills(data.modules, active ? active.id : '');

  } catch (err) {
    console.error('Error polling status:', err);
  }
}

/**
 * Render Module Pills
 */
function renderModulePills(modules, activeId) {
  if (!modules) return;
  modulePillsList.innerHTML = '';

  modules.forEach(m => {
    const pill = document.createElement('div');
    pill.className = `module-pill ${m.id === activeId ? 'active' : ''}`;
    pill.innerHTML = `
      <span>${m.name || m.id}</span>
      <span class="pill-toggle">${m.enabled ? '✓ Enabled' : '✕ Disabled'}</span>
    `;

    pill.addEventListener('click', async () => {
      await fetch('/api/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id })
      });
      refreshScreenImage();
      pollStatus();
    });

    modulePillsList.appendChild(pill);
  });
}

// Button Events
btnPrev.addEventListener('click', async () => {
  await fetch('/api/prev');
  refreshScreenImage();
  pollStatus();
});

btnNext.addEventListener('click', async () => {
  await fetch('/api/next');
  refreshScreenImage();
  pollStatus();
});

btnPause.addEventListener('click', async () => {
  await fetch('/api/action');
  pollStatus();
});

btnRefresh.addEventListener('click', () => {
  refreshScreenImage();
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
    btnPrev.click();
  } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
    btnNext.click();
  } else if (e.key === ' ' || e.key === 'a' || e.key === 'A') {
    btnPause.click();
  } else if (e.key === 'r' || e.key === 'R') {
    btnRefresh.click();
  }
});

// Poll every 1 second
setInterval(pollStatus, 1000);
pollStatus();
