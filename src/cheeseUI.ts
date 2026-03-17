/**
 * 🧀 Cheese Calculator UI Bridge
 * Connects the LasagneCheeseCalculator9000™ to actual DOM elements.
 * Because separation of concerns is non-negotiable, even for dairy.
 */

import {
  cheeseCalculator,
  type CheeseVariety,
  type CheeseCalculationResult,
} from './cheese';

// ─── State ────────────────────────────────────────────────────────────────────
let selectedCheeses = new Set<CheeseVariety>(['MOZZARELLA', 'RICOTTA', 'PARMESAN']);
let selectedStrategy = 'UNIFORM';

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  renderCheeseVarietyGrid();
  renderStrategyButtons();

  // Wire the cheese events to celebratory particles
  cheeseCalculator.on('OPTIMAL_CHEESE_ACHIEVED', () => {
    if (window.app) {
      // Borrow the todo app's particle system for maximum cheese celebration
      (window.app as any).particles?.spawn(window.innerWidth / 2, window.innerHeight / 2, 200);
    }
  });

  cheeseCalculator.on('CALCULATION_COMPLETE', (event) => {
    console.log('🧀 Cheese calculation complete:', event.payload);
  });
}

// ─── Render Cheese Variety Grid ───────────────────────────────────────────────
function renderCheeseVarietyGrid() {
  const grid = document.getElementById('cheese-variety-grid')!;
  const allCheeses = cheeseCalculator.getAllCheeses();

  grid.innerHTML = allCheeses.map(profile => `
    <button
      class="cheese-variety-btn ${selectedCheeses.has(profile.variety) ? 'selected' : ''}"
      data-variety="${profile.variety}"
      onclick="window.toggleCheeseVariety('${profile.variety}')"
      title="${profile.pretentiousDescription}"
    >
      <span class="cheese-emoji">${profile.emoji}</span>
      <span class="cheese-name">${profile.variety.replace('_', ' ')}</span>
      <span class="cheese-base">${profile.gramsPerLayer}g/layer</span>
    </button>
  `).join('');
}

// ─── Render Strategy Buttons ─────────────────────────────────────────────────
function renderStrategyButtons() {
  const container = document.getElementById('strategy-buttons')!;
  const strategies = cheeseCalculator.strategies;

  container.innerHTML = Object.entries(strategies).map(([key, strategy]) => `
    <button
      class="strategy-btn ${selectedStrategy === key ? 'active' : ''}"
      data-strategy="${key}"
      onclick="window.selectStrategy('${key}')"
      title="${strategy.getDescription()}"
    >
      ${strategyEmoji(key)} ${key.replace('_', ' ')}
    </button>
  `).join('');
}

function strategyEmoji(key: string): string {
  return { UNIFORM: '⚖️', TOP_HEAVY: '🏔️', FIBONACCI: '🌀', CHAOS: '🎲' }[key] ?? '❓';
}

// ─── Toggle Cheese ────────────────────────────────────────────────────────────
(window as any).toggleCheeseVariety = (variety: CheeseVariety) => {
  if (selectedCheeses.has(variety)) {
    if (selectedCheeses.size > 1) selectedCheeses.delete(variety);
  } else {
    selectedCheeses.add(variety);
  }
  renderCheeseVarietyGrid();
};

// ─── Select Strategy ─────────────────────────────────────────────────────────
(window as any).selectStrategy = (strategy: string) => {
  selectedStrategy = strategy;
  renderStrategyButtons();
};

// ─── Run Calculation ──────────────────────────────────────────────────────────
(window as any).runCheeseCalculation = () => {
  const servingsInput = document.getElementById('cheese-servings') as HTMLInputElement;
  const layersInput = document.getElementById('cheese-layers') as HTMLInputElement;

  const servingCount = Math.max(1, parseInt(servingsInput.value) || 4);
  const layerCount = Math.max(2, parseInt(layersInput.value) || 4);

  const result = cheeseCalculator.calculate(
    servingCount,
    layerCount,
    Array.from(selectedCheeses),
    selectedStrategy
  );

  renderResults(result);
};

// ─── Render Results ───────────────────────────────────────────────────────────
function renderResults(result: CheeseCalculationResult) {
  const panel = document.getElementById('cheese-results')!;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Rating banner
  const ratingEmoji: Record<string, string> = {
    INSUFFICIENT: '😢', ACCEPTABLE: '😐', GOOD: '😊', EXCESSIVE: '😅', DANGEROUSLY_GOOD: '🤯'
  };
  const ratingColor: Record<string, string> = {
    INSUFFICIENT: '#ef4444', ACCEPTABLE: '#f59e0b', GOOD: '#10b981',
    EXCESSIVE: '#f97316', DANGEROUSLY_GOOD: '#8b5cf6'
  };
  const banner = document.getElementById('cheese-rating-banner')!;
  banner.textContent = `${ratingEmoji[result.cheeseRating]} ${result.cheeseRating.replace('_', ' ')}`;
  banner.style.background = ratingColor[result.cheeseRating];

  // Stats
  document.getElementById('result-total-grams')!.textContent = `${result.grandTotalGrams.toFixed(0)}g`;
  document.getElementById('result-per-serving')!.textContent =
    `${(result.grandTotalGrams / result.servings).toFixed(0)}g`;
  document.getElementById('result-layers')!.textContent = result.layerCount.toString();
  document.getElementById('result-strategy')!.textContent = result.strategy;

  // Per-cheese breakdown
  const breakdownEl = document.getElementById('cheese-breakdown')!;
  const allCheeses = cheeseCalculator.getAllCheeses();
  breakdownEl.innerHTML = '<h4>Cheese Breakdown</h4>' + Array.from(result.totals.entries()).map(([variety, g]) => {
    const profile = allCheeses.find(c => c.variety === variety)!;
    const pct = ((g / result.grandTotalGrams) * 100).toFixed(1);
    return `
      <div class="breakdown-row">
        <span>${profile.emoji} ${variety.replace('_', ' ')}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar" style="width:${pct}%"></div>
        </div>
        <span class="breakdown-grams">${g.toFixed(0)}g (${pct}%)</span>
      </div>
    `;
  }).join('');

  // Layer visual
  const layerEl = document.getElementById('layer-visual')!;
  layerEl.innerHTML = '<h4>Layer Stack</h4>' + result.layers.map((layer, i) => {
    return `
      <div class="layer-row">
        <span class="layer-label">Layer ${i + 1}</span>
        <div class="layer-bar-wrap">
          ${layer.cheeses.map(c => {
            const w = ((c.grams / layer.totalGrams) * 100).toFixed(1);
            return `<div class="layer-segment" style="width:${w}%" title="${c.variety}: ${c.grams.toFixed(0)}g">${c.emoji}</div>`;
          }).join('')}
        </div>
        <span class="layer-total">${layer.totalGrams.toFixed(0)}g</span>
      </div>
    `;
  }).join('');

  // Recommendation
  document.getElementById('cheese-recommendation')!.textContent = `💬 ${result.recommendation}`;

  // Warnings
  const warningsEl = document.getElementById('cheese-warnings')!;
  warningsEl.innerHTML = result.warnings.map(w => `<div class="cheese-warning">${w}</div>`).join('');
  warningsEl.style.display = result.warnings.length ? 'block' : 'none';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
