/**
 * 🔬 CHEESE OPTIMISER 9000™
 *
 * A multi-objective combinatorial search engine for achieving
 * thermodynamically perfect lasagne cheese distribution.
 *
 * Techniques employed:
 *   - Exhaustive candidate genome enumeration
 *   - Multi-objective fitness scoring (7 dimensions)
 *   - Simulated annealing for continuous weight optimisation
 *   - Pareto front approximation
 *   - Async iterative search with live progress callbacks
 *
 * "It's just a lasagne" — someone who has never tasted perfection
 */

import type { CheeseVariety, CheeseProfile } from './cheese';

// ─── Fitness Dimensions ───────────────────────────────────────────────────────
export interface FitnessVector {
  /** Total melt coverage: weighted meltFactor × grams. Higher = more ooze. */
  meltScore: number;
  /** Flavour balance: penalises saltiness extremes, rewards spread. */
  flavourBalance: number;
  /** Structural integrity: layers shouldn't exceed a weight that causes collapse. */
  structuralIntegrity: number;
  /** Cheese variety diversity bonus. */
  diversityBonus: number;
  /** How close total grams/serving is to the golden zone (150–200g). */
  portionOptimality: number;
  /** Penalty for including cheeses that clash (high saltiness combos). */
  harmonyPenalty: number;
  /** Prestige score: Parmesan and Mozzarella together = legendary. */
  prestigeScore: number;
  /** Composite weighted score (0–100). */
  composite: number;
}

// ─── A Candidate Solution ─────────────────────────────────────────────────────
export interface CheeseGenome {
  /** Which cheeses are included */
  varieties: CheeseVariety[];
  /** Weight allocation per cheese (sums to 1.0) */
  weights: number[];
  /** Distribution strategy name */
  strategy: string;
  /** Computed fitness */
  fitness: FitnessVector;
  /** Generation this was produced in */
  generation: number;
}

// ─── Optimiser Config ─────────────────────────────────────────────────────────
export interface OptimiserConfig {
  servings: number;
  layerCount: number;
  /** Which cheeses are candidates. All 6 if omitted. */
  candidateCheeses?: CheeseVariety[];
  /** Max ms to spend searching */
  timeBudgetMs?: number;
  /** Simulated annealing iterations per candidate */
  annealingSteps?: number;
  /** 0–1 weights for each fitness dimension */
  fitnessWeights?: Partial<FitnessWeights>;
  onProgress?: (progress: OptimiserProgress) => void;
}

export interface FitnessWeights {
  meltScore: number;
  flavourBalance: number;
  structuralIntegrity: number;
  diversityBonus: number;
  portionOptimality: number;
  harmonyPenalty: number;
  prestigeScore: number;
}

const DEFAULT_FITNESS_WEIGHTS: FitnessWeights = {
  meltScore: 0.20,
  flavourBalance: 0.18,
  structuralIntegrity: 0.12,
  diversityBonus: 0.10,
  portionOptimality: 0.20,
  harmonyPenalty: 0.10,
  prestigeScore: 0.10,
};

// ─── Progress reporting ───────────────────────────────────────────────────────
export interface OptimiserProgress {
  phase: 'ENUMERATING' | 'ANNEALING' | 'RANKING' | 'COMPLETE';
  candidatesEvaluated: number;
  totalCandidates: number;
  currentBestScore: number;
  elapsedMs: number;
  bestSoFar: CheeseGenome | null;
}

// ─── Optimiser Result ─────────────────────────────────────────────────────────
export interface OptimiserResult {
  winner: CheeseGenome;
  paretoFront: CheeseGenome[];
  allCandidates: CheeseGenome[];
  totalEvaluated: number;
  elapsedMs: number;
  scoreImprovement: number;
  verdict: string;
  iterationLog: Array<{ generation: number; score: number; varieties: string }>;
}

// ─── All cheese profiles (local copy to avoid circular dep) ──────────────────
const CHEESE_DATA: Record<CheeseVariety, CheeseProfile> = {
  RICOTTA:        { variety: 'RICOTTA',        gramsPerLayer: 120 as any, meltFactor: 1.0, saltiness: 3,  emoji: '🧀', pretentiousDescription: '' },
  MOZZARELLA:     { variety: 'MOZZARELLA',     gramsPerLayer: 100 as any, meltFactor: 1.6, saltiness: 4,  emoji: '🫧', pretentiousDescription: '' },
  PARMESAN:       { variety: 'PARMESAN',       gramsPerLayer: 40  as any, meltFactor: 0.9, saltiness: 9,  emoji: '✨', pretentiousDescription: '' },
  BECHAMEL_CHEESE:{ variety: 'BECHAMEL_CHEESE',gramsPerLayer: 60  as any, meltFactor: 1.3, saltiness: 5,  emoji: '🤍', pretentiousDescription: '' },
  GOUDA:          { variety: 'GOUDA',          gramsPerLayer: 80  as any, meltFactor: 1.4, saltiness: 6,  emoji: '🟡', pretentiousDescription: '' },
  PROVOLONE:      { variety: 'PROVOLONE',      gramsPerLayer: 70  as any, meltFactor: 1.5, saltiness: 7,  emoji: '🔶', pretentiousDescription: '' },
};

const ALL_VARIETIES = Object.keys(CHEESE_DATA) as CheeseVariety[];
const ALL_STRATEGIES = ['UNIFORM', 'TOP_HEAVY', 'FIBONACCI'];

// ─── Fitness Engine ───────────────────────────────────────────────────────────
class FitnessEngine {
  private weights: FitnessWeights;

  constructor(weights: Partial<FitnessWeights> = {}) {
    this.weights = { ...DEFAULT_FITNESS_WEIGHTS, ...weights };
  }

  evaluate(
    varieties: CheeseVariety[],
    weightAllocs: number[],
    servings: number,
    layerCount: number,
    strategy: string
  ): FitnessVector {
    const profiles = varieties.map(v => CHEESE_DATA[v]);
    const scaleFactor = servings / 4;

    // Total grams per cheese using weight allocations
    const baseTotal = profiles.reduce((sum, p) => sum + p.gramsPerLayer * scaleFactor * layerCount, 0);
    const gramsPerCheese = weightAllocs.map(w => w * baseTotal);
    const grandTotal = gramsPerCheese.reduce((a, b) => a + b, 0);
    const gramsPerServing = grandTotal / servings;

    // 1. Melt score — weighted sum of meltFactor × grams
    const meltScore = Math.min(100,
      profiles.reduce((sum, p, i) => sum + p.meltFactor * gramsPerCheese[i], 0) / grandTotal * 60
    );

    // 2. Flavour balance — reward median saltiness near 5, penalise extremes
    const saltinesses = profiles.map(p => p.saltiness);
    const avgSalt = saltinesses.reduce((a, b) => a + b, 0) / saltinesses.length;
    const saltVariance = saltinesses.reduce((sum, s) => sum + Math.pow(s - avgSalt, 2), 0) / saltinesses.length;
    const flavourBalance = Math.max(0, 100 - Math.abs(avgSalt - 5) * 8 - saltVariance * 2);

    // 3. Structural integrity — penalise if any single layer exceeds 250g
    const gramsPerLayer = grandTotal / layerCount;
    const structuralIntegrity = gramsPerLayer > 250
      ? Math.max(0, 100 - (gramsPerLayer - 250) * 0.5)
      : 100;

    // 4. Diversity bonus — more variety = more points, up to 4 cheeses optimal
    const diversityBonus = Math.min(100, (varieties.length / 4) * 100);

    // 5. Portion optimality — golden zone 150–200g/serving
    const portionOptimality = (() => {
      if (gramsPerServing >= 150 && gramsPerServing <= 200) return 100;
      if (gramsPerServing < 150) return Math.max(0, 100 - (150 - gramsPerServing) * 1.5);
      return Math.max(0, 100 - (gramsPerServing - 200) * 0.8);
    })();

    // 6. Harmony penalty — high-saltiness pairs clash
    let harmonyPenalty = 100;
    for (let i = 0; i < saltinesses.length; i++) {
      for (let j = i + 1; j < saltinesses.length; j++) {
        const clash = Math.abs(saltinesses[i] - saltinesses[j]);
        if (clash > 5) harmonyPenalty -= 15;
        else if (clash > 3) harmonyPenalty -= 5;
      }
    }
    harmonyPenalty = Math.max(0, harmonyPenalty);

    // 7. Prestige score — Parmesan + Mozzarella = +40, each alone = +15
    const hasParm = varieties.includes('PARMESAN');
    const hasMozz = varieties.includes('MOZZARELLA');
    const prestigeScore = hasParm && hasMozz ? 100 : hasParm || hasMozz ? 50 : 10;

    // Strategy modifier
    const strategyBonus = strategy === 'FIBONACCI' ? 1.05 : strategy === 'TOP_HEAVY' ? 1.02 : 1.0;

    const w = this.weights;
    const composite = Math.min(100, (
      meltScore          * w.meltScore +
      flavourBalance     * w.flavourBalance +
      structuralIntegrity * w.structuralIntegrity +
      diversityBonus     * w.diversityBonus +
      portionOptimality  * w.portionOptimality +
      harmonyPenalty     * w.harmonyPenalty +
      prestigeScore      * w.prestigeScore
    ) * strategyBonus);

    return {
      meltScore, flavourBalance, structuralIntegrity,
      diversityBonus, portionOptimality, harmonyPenalty,
      prestigeScore, composite,
    };
  }
}

// ─── Simulated Annealing for weight refinement ────────────────────────────────
function annealWeights(
  initial: number[],
  evaluateFn: (w: number[]) => number,
  steps: number
): number[] {
  let current = [...initial];
  let currentScore = evaluateFn(current);
  let best = [...current];
  let bestScore = currentScore;
  let temperature = 1.0;
  const cooling = Math.pow(0.001 / 1.0, 1 / steps); // cool to 0.001

  for (let i = 0; i < steps; i++) {
    // Perturb: randomly shift weight from one cheese to another
    const candidate = [...current];
    const from = Math.floor(Math.random() * candidate.length);
    const to = Math.floor(Math.random() * candidate.length);
    if (from === to) continue;

    const delta = Math.random() * 0.15 * temperature;
    candidate[from] = Math.max(0.05, candidate[from] - delta);
    candidate[to] = Math.min(0.9, candidate[to] + delta);

    // Renormalise
    const total = candidate.reduce((a, b) => a + b, 0);
    const normalised = candidate.map(w => w / total);

    const score = evaluateFn(normalised);
    const diff = score - currentScore;

    // Accept if better, or with probability e^(diff/T) if worse
    if (diff > 0 || Math.random() < Math.exp(diff / temperature)) {
      current = normalised;
      currentScore = score;
      if (score > bestScore) { best = [...normalised]; bestScore = score; }
    }

    temperature *= cooling;
  }

  return best;
}

// ─── Power set (all subsets of size ≥ 2) ─────────────────────────────────────
function powerSetMinTwo<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  const n = arr.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    const subset: T[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(arr[i]);
    }
    if (subset.length >= 2) result.push(subset);
  }
  return result;
}

// ─── The Optimiser ────────────────────────────────────────────────────────────
export class CheeseOptimiser {
  async optimise(config: OptimiserConfig): Promise<OptimiserResult> {
    const {
      servings,
      layerCount,
      candidateCheeses = ALL_VARIETIES,
      timeBudgetMs = 3000,
      annealingSteps = 80,
      fitnessWeights = {},
      onProgress,
    } = config;

    const engine = new FitnessEngine(fitnessWeights);
    const startTime = Date.now();
    const allCandidates: CheeseGenome[] = [];
    const iterationLog: Array<{ generation: number; score: number; varieties: string }> = [];

    // Enumerate all cheese subset × strategy combinations
    const subsets = powerSetMinTwo(candidateCheeses);
    const totalCombinations = subsets.length * ALL_STRATEGIES.length;
    let evaluated = 0;
    let generation = 0;
    let bestSoFar: CheeseGenome | null = null;

    onProgress?.({
      phase: 'ENUMERATING',
      candidatesEvaluated: 0,
      totalCandidates: totalCombinations,
      currentBestScore: 0,
      elapsedMs: 0,
      bestSoFar: null,
    });

    // Yield to event loop between batches
    const yieldIfNeeded = () => new Promise<void>(r => setTimeout(r, 0));

    for (const varieties of subsets) {
      for (const strategy of ALL_STRATEGIES) {
        if (Date.now() - startTime > timeBudgetMs) break;

        // Start with uniform weights
        const uniformWeights = varieties.map(() => 1 / varieties.length);

        // Phase 1: evaluate uniform baseline
        const baselineFitness = engine.evaluate(varieties, uniformWeights, servings, layerCount, strategy);

        // Phase 2: anneal to find better weights
        const evaluateFn = (w: number[]) =>
          engine.evaluate(varieties, w, servings, layerCount, strategy).composite;

        const annealedWeights = annealWeights(uniformWeights, evaluateFn, annealingSteps);
        const annealedFitness = engine.evaluate(varieties, annealedWeights, servings, layerCount, strategy);

        // Keep the better of the two
        const winner = annealedFitness.composite >= baselineFitness.composite
          ? { weights: annealedWeights, fitness: annealedFitness }
          : { weights: uniformWeights, fitness: baselineFitness };

        const genome: CheeseGenome = {
          varieties: [...varieties],
          weights: winner.weights,
          strategy,
          fitness: winner.fitness,
          generation: ++generation,
        };

        allCandidates.push(genome);

        if (!bestSoFar || genome.fitness.composite > bestSoFar.fitness.composite) {
          bestSoFar = genome;
          iterationLog.push({
            generation,
            score: genome.fitness.composite,
            varieties: varieties.map(v => CHEESE_DATA[v].emoji + v).join(', '),
          });
        }

        evaluated++;

        if (evaluated % 5 === 0) {
          onProgress?.({
            phase: 'ANNEALING',
            candidatesEvaluated: evaluated,
            totalCandidates: totalCombinations,
            currentBestScore: bestSoFar?.fitness.composite ?? 0,
            elapsedMs: Date.now() - startTime,
            bestSoFar,
          });
          await yieldIfNeeded();
        }
      }
    }

    // Pareto front: non-dominated solutions across melt + portion + flavour
    onProgress?.({
      phase: 'RANKING',
      candidatesEvaluated: evaluated,
      totalCandidates: totalCombinations,
      currentBestScore: bestSoFar?.fitness.composite ?? 0,
      elapsedMs: Date.now() - startTime,
      bestSoFar,
    });

    const paretoFront = computeParetoFront(allCandidates);

    const elapsed = Date.now() - startTime;
    const winner = allCandidates.sort((a, b) => b.fitness.composite - a.fitness.composite)[0];
    const worstScore = allCandidates[allCandidates.length - 1]?.fitness.composite ?? 0;
    const scoreImprovement = winner.fitness.composite - worstScore;

    const verdict = generateVerdict(winner);

    onProgress?.({
      phase: 'COMPLETE',
      candidatesEvaluated: evaluated,
      totalCandidates: totalCombinations,
      currentBestScore: winner.fitness.composite,
      elapsedMs: elapsed,
      bestSoFar: winner,
    });

    return {
      winner,
      paretoFront,
      allCandidates,
      totalEvaluated: evaluated,
      elapsedMs: elapsed,
      scoreImprovement,
      verdict,
      iterationLog,
    };
  }
}

// ─── Pareto front (maximise meltScore + portionOptimality + flavourBalance) ──
function computeParetoFront(candidates: CheeseGenome[]): CheeseGenome[] {
  return candidates.filter(a => {
    return !candidates.some(b =>
      b.fitness.meltScore >= a.fitness.meltScore &&
      b.fitness.portionOptimality >= a.fitness.portionOptimality &&
      b.fitness.flavourBalance >= a.fitness.flavourBalance &&
      b.fitness.composite > a.fitness.composite
    );
  });
}

// ─── Verdict generator ────────────────────────────────────────────────────────
function generateVerdict(winner: CheeseGenome): string {
  const score = winner.fitness.composite;
  const varieties = winner.varieties.map(v => CHEESE_DATA[v].emoji + ' ' + v.replace('_', ' ')).join(', ');
  const strategyDesc: Record<string, string> = {
    UNIFORM: 'with stoic uniformity',
    TOP_HEAVY: 'loaded gloriously toward the top',
    FIBONACCI: 'distributed in golden-ratio harmony',
  };

  const adjective =
    score >= 90 ? 'TRANSCENDENT' :
    score >= 75 ? 'EXCEPTIONAL' :
    score >= 60 ? 'SOLID' :
    'ACCEPTABLE';

  return `After evaluating every possible cheese combination across 3 distribution strategies ` +
    `and ${80} simulated annealing steps each, the optimiser has reached its verdict. ` +
    `The ${adjective} combination is: ${varieties}, ` +
    `arranged ${strategyDesc[winner.strategy] ?? 'strategically'}, ` +
    `achieving a composite fitness score of ${score.toFixed(1)}/100. ` +
    `Science has spoken. Your lasagne thanks you.`;
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const cheeseOptimiser = new CheeseOptimiser();
