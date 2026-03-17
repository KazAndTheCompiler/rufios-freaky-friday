/**
 * 🔬 Cheese Optimiser UI
 * Wires the CheeseOptimiser to the DOM.
 * Renders a live progress bar, iteration log, fitness radar, and winner card.
 */

import { cheeseOptimiser, type OptimiserProgress, type OptimiserResult, type CheeseGenome } from './cheeseOptimiser';
import type { CheeseVariety } from './cheese';

const CHEESE_EMOJI: Record<CheeseVariety, string> = {
  RICOTTA: '🧀', MOZZARELLA: '🫧', PARMESAN: '✨',
  BECHAMEL_CHEESE: '🤍', GOUDA: '🟡', PROVOLONE: '🔶',
};

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initOptimiserUI() {
  renderOptimiserSection();
}

function renderOptimiserSection() {
  // Insert after the cheese section
  const cheeseSection = document.querySelector('.cheese-section');
  if (!cheeseSection) return;

  const section = document.createElement('section');
  section.className = 'optimiser-section';
  section.innerHTML = `
    <div class="optimiser-header">
      <h2>🔬 Cheese Optimiser 9000™</h2>
      <p class="optimiser-subtitle">Multi-objective combinatorial brute-force dairy solver</p>
    </div>

    <div class="optimiser-config">
      <div class="optimiser-inputs">
        <div class="opt-input-group">
          <label for="opt-servings">Servings</label>
          <input type="number" id="opt-servings" value="4" min="1" max="20" />
        </div>
        <div class="opt-input-group">
          <label for="opt-layers">Layers</label>
          <input type="number" id="opt-layers" value="4" min="2" max="10" />
        </div>
        <div class="opt-input-group">
          <label for="opt-budget">Time Budget (ms)</label>
          <input type="number" id="opt-budget" value="2500" min="500" max="10000" step="500" />
        </div>
      </div>

      <div class="fitness-weight-sliders" id="fitness-sliders"></div>

      <button class="optimise-btn" id="optimise-btn">
        🧬 Run Optimisation
      </button>
    </div>

    <div class="optimiser-progress" id="optimiser-progress" style="display:none">
      <div class="progress-phase" id="progress-phase">INITIALISING</div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progress-fill" style="width:0%"></div>
      </div>
      <div class="progress-stats">
        <span id="progress-evaluated">0 / ? candidates</span>
        <span id="progress-score">Best: 0.0</span>
        <span id="progress-elapsed">0ms</span>
      </div>
      <div class="iteration-log" id="iteration-log"></div>
    </div>

    <div class="optimiser-results" id="optimiser-results" style="display:none">
      <div class="winner-card" id="winner-card"></div>
      <div class="fitness-breakdown" id="fitness-breakdown"></div>
      <div class="pareto-front" id="pareto-front"></div>
      <div class="verdict-box" id="verdict-box"></div>
    </div>
  `;

  cheeseSection.after(section);
  renderFitnessSliders();

  document.getElementById('optimise-btn')!.addEventListener('click', runOptimisation);
}

// ─── Fitness weight sliders ───────────────────────────────────────────────────
const WEIGHT_LABELS: Record<string, string> = {
  meltScore: '🫠 Melt Score',
  flavourBalance: '🎵 Flavour Balance',
  structuralIntegrity: '🏗️ Structural Integrity',
  diversityBonus: '🌈 Diversity Bonus',
  portionOptimality: '⚖️ Portion Optimality',
  harmonyPenalty: '🤝 Harmony Penalty',
  prestigeScore: '👑 Prestige Score',
};

const currentWeights: Record<string, number> = {
  meltScore: 0.20, flavourBalance: 0.18, structuralIntegrity: 0.12,
  diversityBonus: 0.10, portionOptimality: 0.20, harmonyPenalty: 0.10, prestigeScore: 0.10,
};

function renderFitnessSliders() {
  const container = document.getElementById('fitness-sliders')!;
  container.innerHTML = `
    <div class="sliders-label">Fitness Weights <span class="sliders-hint">(drag to reprioritise the universe)</span></div>
    ${Object.entries(WEIGHT_LABELS).map(([key, label]) => `
      <div class="slider-row">
        <span class="slider-label">${label}</span>
        <input type="range" min="0" max="0.5" step="0.01"
          value="${currentWeights[key]}"
          data-key="${key}"
          class="fitness-slider"
          oninput="window.updateFitnessWeight('${key}', this.value)"
        />
        <span class="slider-value" id="sw-${key}">${(currentWeights[key] * 100).toFixed(0)}%</span>
      </div>
    `).join('')}
  `;
}

(window as any).updateFitnessWeight = (key: string, val: string) => {
  currentWeights[key] = parseFloat(val);
  const el = document.getElementById(`sw-${key}`);
  if (el) el.textContent = (parseFloat(val) * 100).toFixed(0) + '%';
};

// ─── Run optimisation ─────────────────────────────────────────────────────────
async function runOptimisation() {
  const btn = document.getElementById('optimise-btn') as HTMLButtonElement;
  const progressPanel = document.getElementById('optimiser-progress')!;
  const resultsPanel = document.getElementById('optimiser-results')!;

  btn.disabled = true;
  btn.textContent = '⏳ Optimising...';
  progressPanel.style.display = 'block';
  resultsPanel.style.display = 'none';
  document.getElementById('iteration-log')!.innerHTML = '';

  const servings = parseInt((document.getElementById('opt-servings') as HTMLInputElement).value) || 4;
  const layerCount = parseInt((document.getElementById('opt-layers') as HTMLInputElement).value) || 4;
  const timeBudgetMs = parseInt((document.getElementById('opt-budget') as HTMLInputElement).value) || 2500;

  const result = await cheeseOptimiser.optimise({
    servings,
    layerCount,
    timeBudgetMs,
    annealingSteps: 80,
    fitnessWeights: { ...currentWeights } as any,
    onProgress: (p) => updateProgress(p),
  });

  renderResults(result);

  btn.disabled = false;
  btn.textContent = '🧬 Run Optimisation';

  // Fire particles if score is exceptional
  if (result.winner.fitness.composite >= 75 && (window as any).app) {
    (window as any).app.particles?.spawn(window.innerWidth / 2, window.innerHeight / 2, 150);
  }
}

// ─── Progress updates ─────────────────────────────────────────────────────────
function updateProgress(p: OptimiserProgress) {
  document.getElementById('progress-phase')!.textContent = p.phase;
  const pct = p.totalCandidates > 0 ? (p.candidatesEvaluated / p.totalCandidates) * 100 : 0;
  document.getElementById('progress-fill')!.style.width = `${pct}%`;
  document.getElementById('progress-evaluated')!.textContent =
    `${p.candidatesEvaluated} / ${p.totalCandidates} candidates`;
  document.getElementById('progress-score')!.textContent =
    `Best: ${p.currentBestScore.toFixed(1)}`;
  document.getElementById('progress-elapsed')!.textContent = `${p.elapsedMs}ms`;
}

// ─── Render results ───────────────────────────────────────────────────────────
function renderResults(result: OptimiserResult) {
  const panel = document.getElementById('optimiser-results')!;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  renderWinnerCard(result.winner, result);
  renderFitnessBreakdown(result.winner);
  renderParetoFront(result.paretoFront);
  renderVerdict(result);
}

function renderWinnerCard(genome: CheeseGenome, result: OptimiserResult) {
  const el = document.getElementById('winner-card')!;
  const score = genome.fitness.composite;
  const scoreColor = score >= 90 ? '#a78bfa' : score >= 75 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';
  const cheeseList = genome.varieties.map((v, i) => {
    const pct = (genome.weights[i] * 100).toFixed(0);
    return `<span class="winner-cheese">${CHEESE_EMOJI[v]} ${v.replace('_', ' ')} <em>${pct}%</em></span>`;
  }).join('');

  el.innerHTML = `
    <div class="winner-score-ring" style="--score-color:${scoreColor}">
      <span class="winner-score-number">${score.toFixed(1)}</span>
      <span class="winner-score-label">/ 100</span>
    </div>
    <div class="winner-details">
      <div class="winner-title">Optimal Genome Found</div>
      <div class="winner-strategy">📐 Strategy: <strong>${genome.strategy}</strong></div>
      <div class="winner-cheeses">${cheeseList}</div>
      <div class="winner-meta">
        ${result.totalEvaluated} candidates evaluated in ${result.elapsedMs}ms ·
        Pareto front: ${result.paretoFront.length} solutions
      </div>
    </div>
  `;
}

function renderFitnessBreakdown(genome: CheeseGenome) {
  const el = document.getElementById('fitness-breakdown')!;
  const dims: Array<[string, number, string]> = [
    ['🫠 Melt', genome.fitness.meltScore, '#60a5fa'],
    ['🎵 Flavour', genome.fitness.flavourBalance, '#34d399'],
    ['🏗️ Structure', genome.fitness.structuralIntegrity, '#fbbf24'],
    ['🌈 Diversity', genome.fitness.diversityBonus, '#f472b6'],
    ['⚖️ Portion', genome.fitness.portionOptimality, '#a78bfa'],
    ['🤝 Harmony', genome.fitness.harmonyPenalty, '#fb923c'],
    ['👑 Prestige', genome.fitness.prestigeScore, '#e879f9'],
  ];

  el.innerHTML = `
    <div class="breakdown-title">Fitness Dimensions</div>
    ${dims.map(([label, score, color]) => `
      <div class="fitness-dim-row">
        <span class="fitness-dim-label">${label}</span>
        <div class="fitness-dim-bar-track">
          <div class="fitness-dim-bar" style="width:${score.toFixed(0)}%;background:${color}"></div>
        </div>
        <span class="fitness-dim-value" style="color:${color}">${score.toFixed(0)}</span>
      </div>
    `).join('')}
  `;
}

function renderParetoFront(front: CheeseGenome[]) {
  const el = document.getElementById('pareto-front')!;
  const top5 = front.slice(0, 5).sort((a, b) => b.fitness.composite - a.fitness.composite);

  el.innerHTML = `
    <div class="breakdown-title">Pareto Front (top ${top5.length})</div>
    ${top5.map((g, rank) => `
      <div class="pareto-row">
        <span class="pareto-rank">#${rank + 1}</span>
        <span class="pareto-cheeses">${g.varieties.map(v => CHEESE_EMOJI[v]).join('')} ${g.varieties.map(v => v.replace('_', ' ')).join(', ')}</span>
        <span class="pareto-strategy">${g.strategy}</span>
        <span class="pareto-score">${g.fitness.composite.toFixed(1)}</span>
      </div>
    `).join('')}
  `;
}

function renderVerdict(result: OptimiserResult) {
  const el = document.getElementById('verdict-box')!;
  el.innerHTML = `
    <div class="verdict-title">📜 The Verdict</div>
    <div class="verdict-text">${result.verdict}</div>
    <div class="iteration-summary">
      <div class="iter-title">Score progression during search</div>
      ${result.iterationLog.map(entry => `
        <div class="iter-row">
          <span class="iter-gen">gen ${entry.generation}</span>
          <div class="iter-bar-track">
            <div class="iter-bar" style="width:${entry.score.toFixed(0)}%"></div>
          </div>
          <span class="iter-score">${entry.score.toFixed(1)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
initOptimiserUI();
