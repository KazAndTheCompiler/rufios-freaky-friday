/**
 * 🧀 LASAGNE CHEESE CALCULATOR 9000™
 * 
 * An enterprise-grade, fully type-safe, event-driven, observable,
 * strategy-pattern-based cheese quantity computation engine.
 * 
 * Because your lasagne deserves microservices-level architecture.
 */

// ─── Type Brands ──────────────────────────────────────────────────────────────
type Grams = number & { readonly __brand: 'Grams' };
type Layers = number & { readonly __brand: 'Layers' };
type Servings = number & { readonly __brand: 'Servings' };

const grams = (n: number): Grams => n as Grams;
const layers = (n: number): Layers => n as Layers;
const servings = (n: number): Servings => n as Servings;

// ─── Cheese Types ─────────────────────────────────────────────────────────────
export type CheeseVariety =
  | 'RICOTTA'
  | 'MOZZARELLA'
  | 'PARMESAN'
  | 'BECHAMEL_CHEESE'
  | 'GOUDA'
  | 'PROVOLONE';

export interface CheeseProfile {
  readonly variety: CheeseVariety;
  readonly gramsPerLayer: Grams;
  readonly meltFactor: number;      // How much it expands when melted (0–2)
  readonly saltiness: number;       // 1–10 scale
  readonly emoji: string;
  readonly pretentiousDescription: string;
}

// ─── Strategy Pattern: Cheese Distribution Strategies ────────────────────────
export interface CheeseDistributionStrategy {
  readonly name: string;
  distribute(totalGrams: Grams, layerCount: Layers): Grams[];
  getDescription(): string;
}

export class UniformDistributionStrategy implements CheeseDistributionStrategy {
  readonly name = 'UNIFORM';
  distribute(totalGrams: Grams, layerCount: Layers): Grams[] {
    const perLayer = grams(totalGrams / layerCount);
    return Array.from({ length: layerCount }, () => perLayer);
  }
  getDescription(): string {
    return 'Equal cheese per layer. Boring but reliable. Like a Honda Civic.';
  }
}

export class TopHeavyDistributionStrategy implements CheeseDistributionStrategy {
  readonly name = 'TOP_HEAVY';
  distribute(totalGrams: Grams, layerCount: Layers): Grams[] {
    // Exponential weighting: top layers get more cheese
    const weights = Array.from({ length: layerCount }, (_, i) => Math.pow(i + 1, 1.5));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => grams((w / totalWeight) * totalGrams));
  }
  getDescription(): string {
    return 'Top-loaded for maximum cheese impact on first bite. Peak optimism.';
  }
}

export class FibonacciDistributionStrategy implements CheeseDistributionStrategy {
  readonly name = 'FIBONACCI';
  private fib(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) { [a, b] = [b, a + b]; }
    return b;
  }
  distribute(totalGrams: Grams, layerCount: Layers): Grams[] {
    const fibs = Array.from({ length: layerCount }, (_, i) => this.fib(i + 1));
    const total = fibs.reduce((a, b) => a + b, 0);
    return fibs.map(f => grams((f / total) * totalGrams));
  }
  getDescription(): string {
    return 'Nature\'s own cheese distribution. The golden ratio of dairy. Da Vinci approved.';
  }
}

export class ChaosDistributionStrategy implements CheeseDistributionStrategy {
  readonly name = 'CHAOS';
  private seed: number;
  constructor(seed = Date.now()) { this.seed = seed; }
  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }
  distribute(totalGrams: Grams, layerCount: Layers): Grams[] {
    const weights = Array.from({ length: layerCount }, () => this.rand());
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => grams((w / total) * totalGrams));
  }
  getDescription(): string {
    return 'Truly random. Chaotic neutral. Every lasagne is a surprise. Gordon Ramsay weeps.';
  }
}

// ─── Observer Pattern: Cheese Events ─────────────────────────────────────────
export type CheeseEventType =
  | 'CALCULATION_STARTED'
  | 'CALCULATION_COMPLETE'
  | 'CHEESE_OVERLOAD_WARNING'
  | 'CHEESE_DEFICIT_WARNING'
  | 'OPTIMAL_CHEESE_ACHIEVED';

export interface CheeseEvent {
  type: CheeseEventType;
  timestamp: number;
  payload: unknown;
}

export type CheeseObserver = (event: CheeseEvent) => void;

class CheeseEventEmitter {
  private observers: Map<CheeseEventType, Set<CheeseObserver>> = new Map();

  on(type: CheeseEventType, observer: CheeseObserver): () => void {
    if (!this.observers.has(type)) this.observers.set(type, new Set());
    this.observers.get(type)!.add(observer);
    return () => this.observers.get(type)?.delete(observer);
  }

  emit(type: CheeseEventType, payload: unknown = {}): void {
    const event: CheeseEvent = { type, timestamp: Date.now(), payload };
    this.observers.get(type)?.forEach(o => o(event));
  }
}

// ─── The Cheese Registry (Singleton) ─────────────────────────────────────────
class CheeseRegistry {
  private static instance: CheeseRegistry;
  private cheeses: Map<CheeseVariety, CheeseProfile>;

  private constructor() {
    this.cheeses = new Map([
      ['RICOTTA', {
        variety: 'RICOTTA', gramsPerLayer: grams(120), meltFactor: 1.0, saltiness: 3,
        emoji: '🧀',
        pretentiousDescription: 'The soft, cloud-like cheese. Milky. Forgiving. Like a hug from a lactose-intolerant grandmother.',
      }],
      ['MOZZARELLA', {
        variety: 'MOZZARELLA', gramsPerLayer: grams(100), meltFactor: 1.6, saltiness: 4,
        emoji: '🫧',
        pretentiousDescription: 'The stretch. The pull. The Instagram moment. Born in Campania, destined for greatness.',
      }],
      ['PARMESAN', {
        variety: 'PARMESAN', gramsPerLayer: grams(40), meltFactor: 0.9, saltiness: 9,
        emoji: '✨',
        pretentiousDescription: 'Aged 24 months minimum. Complex. Nutty. The Michelin star of cheeses. Use sparingly unless you are reckless.',
      }],
      ['BECHAMEL_CHEESE', {
        variety: 'BECHAMEL_CHEESE', gramsPerLayer: grams(60), meltFactor: 1.3, saltiness: 5,
        emoji: '🤍',
        pretentiousDescription: 'The béchamel\'s cheese counterpart. Comforting. The kind of cheese that understands you.',
      }],
      ['GOUDA', {
        variety: 'GOUDA', gramsPerLayer: grams(80), meltFactor: 1.4, saltiness: 6,
        emoji: '🟡',
        pretentiousDescription: 'Dutch engineering meets Italian pasta. Mild, buttery, and slightly smug about it.',
      }],
      ['PROVOLONE', {
        variety: 'PROVOLONE', gramsPerLayer: grams(70), meltFactor: 1.5, saltiness: 7,
        emoji: '🔶',
        pretentiousDescription: 'Sharp. Bold. The cheese that shows up to the party and immediately takes over the aux cable.',
      }],
    ]);
  }

  static getInstance(): CheeseRegistry {
    if (!CheeseRegistry.instance) CheeseRegistry.instance = new CheeseRegistry();
    return CheeseRegistry.instance;
  }

  get(variety: CheeseVariety): CheeseProfile {
    return this.cheeses.get(variety)!;
  }

  getAll(): CheeseProfile[] {
    return Array.from(this.cheeses.values());
  }
}

// ─── The Calculation Result ───────────────────────────────────────────────────
export interface LayerBreakdown {
  layerIndex: number;
  cheeses: Array<{ variety: CheeseVariety; grams: Grams; emoji: string }>;
  totalGrams: Grams;
}

export interface CheeseCalculationResult {
  readonly servings: Servings;
  readonly layerCount: Layers;
  readonly selectedCheeses: CheeseVariety[];
  readonly strategy: string;
  readonly layers: LayerBreakdown[];
  readonly totals: Map<CheeseVariety, Grams>;
  readonly grandTotalGrams: Grams;
  readonly grandTotalKg: number;
  readonly cheeseRating: CheeseRating;
  readonly warnings: string[];
  readonly recommendation: string;
  readonly calculatedAt: number;
}

type CheeseRating = 'INSUFFICIENT' | 'ACCEPTABLE' | 'GOOD' | 'EXCESSIVE' | 'DANGEROUSLY_GOOD';

// ─── The Main Engine ──────────────────────────────────────────────────────────
export class LasagneCheeseCalculator {
  private readonly registry = CheeseRegistry.getInstance();
  private readonly emitter = new CheeseEventEmitter();
  private history: CheeseCalculationResult[] = [];

  readonly strategies: Record<string, CheeseDistributionStrategy> = {
    UNIFORM: new UniformDistributionStrategy(),
    TOP_HEAVY: new TopHeavyDistributionStrategy(),
    FIBONACCI: new FibonacciDistributionStrategy(),
    CHAOS: new ChaosDistributionStrategy(),
  };

  on(type: CheeseEventType, observer: CheeseObserver) {
    return this.emitter.on(type, observer);
  }

  calculate(
    servingCount: number,
    layerCount: number,
    selectedCheeses: CheeseVariety[],
    strategyName: string = 'UNIFORM'
  ): CheeseCalculationResult {
    this.emitter.emit('CALCULATION_STARTED', { servingCount, layerCount, selectedCheeses });

    const strategy = this.strategies[strategyName] ?? this.strategies.UNIFORM;
    const s = servings(servingCount);
    const l = layers(layerCount);

    // Scale cheese per layer by servings (base is 4 servings)
    const scaleFactor = servingCount / 4;

    const warnings: string[] = [];
    const totals = new Map<CheeseVariety, Grams>();

    // Build layer breakdowns
    const layerBreakdowns: LayerBreakdown[] = Array.from({ length: layerCount }, (_, i) => ({
      layerIndex: i,
      cheeses: [],
      totalGrams: grams(0),
    }));

    for (const variety of selectedCheeses) {
      const profile = this.registry.get(variety);
      const totalForCheese = grams(profile.gramsPerLayer * scaleFactor * layerCount);
      const distribution = strategy.distribute(totalForCheese, l);

      distribution.forEach((amount, i) => {
        layerBreakdowns[i].cheeses.push({ variety, grams: amount, emoji: profile.emoji });
        (layerBreakdowns[i] as { totalGrams: Grams }).totalGrams =
          grams(layerBreakdowns[i].totalGrams + amount);
      });

      totals.set(variety, totalForCheese);
    }

    const grandTotal = grams(Array.from(totals.values()).reduce((a, b) => a + b, 0));
    const gramsPerServing = grandTotal / servingCount;
    const rating = this.rateCheeseLoad(gramsPerServing);
    const recommendation = this.generateRecommendation(rating, gramsPerServing, selectedCheeses);

    if (grandTotal > 1500) {
      warnings.push(`⚠️ ${grandTotal.toFixed(0)}g of cheese detected. Your cardiologist has been notified.`);
      this.emitter.emit('CHEESE_OVERLOAD_WARNING', { grandTotal });
    }
    if (grandTotal < 200) {
      warnings.push('⚠️ This is barely cheese. This is a cheese rumour. A cheese whisper.');
      this.emitter.emit('CHEESE_DEFICIT_WARNING', { grandTotal });
    }
    if (rating === 'DANGEROUSLY_GOOD') {
      this.emitter.emit('OPTIMAL_CHEESE_ACHIEVED', { grandTotal });
    }

    const result: CheeseCalculationResult = {
      servings: s,
      layerCount: l,
      selectedCheeses,
      strategy: strategy.name,
      layers: layerBreakdowns,
      totals,
      grandTotalGrams: grandTotal,
      grandTotalKg: grandTotal / 1000,
      cheeseRating: rating,
      warnings,
      recommendation,
      calculatedAt: Date.now(),
    };

    this.history.push(result);
    this.emitter.emit('CALCULATION_COMPLETE', result);
    return result;
  }

  private rateCheeseLoad(gramsPerServing: number): CheeseRating {
    if (gramsPerServing < 80) return 'INSUFFICIENT';
    if (gramsPerServing < 120) return 'ACCEPTABLE';
    if (gramsPerServing < 180) return 'GOOD';
    if (gramsPerServing < 250) return 'EXCESSIVE';
    return 'DANGEROUSLY_GOOD';
  }

  private generateRecommendation(
    rating: CheeseRating,
    gramsPerServing: number,
    cheeses: CheeseVariety[]
  ): string {
    const hasParmesan = cheeses.includes('PARMESAN');
    const hasMozz = cheeses.includes('MOZZARELLA');

    const ratingMessages: Record<CheeseRating, string> = {
      INSUFFICIENT: `${gramsPerServing.toFixed(0)}g/serving is not a lasagne. It is a pasta with regrets. Add more cheese immediately.`,
      ACCEPTABLE: `${gramsPerServing.toFixed(0)}g/serving is technically adequate. Like a firm handshake. It will do.`,
      GOOD: `${gramsPerServing.toFixed(0)}g/serving. This is the sweet spot. Nonna would approve (maybe).`,
      EXCESSIVE: `${gramsPerServing.toFixed(0)}g/serving. Bold. Courageous. Your arteries have filed a formal complaint.`,
      DANGEROUSLY_GOOD: `${gramsPerServing.toFixed(0)}g/serving. You have transcended. This lasagne is now a spiritual experience.`,
    };

    let rec = ratingMessages[rating];
    if (!hasParmesan) rec += ' Consider adding Parmesan for depth and prestige.';
    if (!hasMozz) rec += ' Mozzarella would add the legendary cheese pull.';
    return rec;
  }

  getHistory(): CheeseCalculationResult[] {
    return [...this.history];
  }

  getAllCheeses(): CheeseProfile[] {
    return this.registry.getAll();
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export const cheeseCalculator = new LasagneCheeseCalculator();
