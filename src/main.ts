/**
 * Rufio's Freaky Friday - Todo App
 * An overengineered todo app with Command pattern, undo/redo, 
 * particle effects, analytics, and event bus architecture.
 */

import './style.css';

// Type definitions
type TaskId = string & { readonly __brand: unique symbol };
type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'TRIVIAL';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED' | 'CANCELLED';

interface Task {
  readonly id: TaskId;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

// Command Pattern
interface Command {
  execute(): void;
  undo(): void;
  getDescription(): string;
}

class AddTaskCommand implements Command {
  private app: TodoApp;
  private title: string;
  private priority: Priority;

  constructor(app: TodoApp, title: string, priority: Priority = 'MEDIUM') {
    this.app = app;
    this.title = title;
    this.priority = priority;
  }

  execute(): void { this.app.addTaskInternal(this.title, this.priority); }
  undo(): void { this.app.removeLastTask(); }
  getDescription(): string { return `Add Task: "${this.title}"`; }
}

class ToggleTaskCommand implements Command {
  private app: TodoApp;
  private taskId: string;

  constructor(app: TodoApp, taskId: string) {
    this.app = app;
    this.taskId = taskId;
  }

  execute(): void { this.app.toggleTaskInternal(this.taskId); }
  undo(): void { this.app.toggleTaskInternal(this.taskId); }
  getDescription(): string { return `Toggle Task: ${this.taskId}`; }
}

class DeleteTaskCommand implements Command {
  private app: TodoApp;
  private taskId: string;
  private task?: Task;

  constructor(app: TodoApp, taskId: string) {
    this.app = app;
    this.taskId = taskId;
  }

  execute(): void { this.task = this.app.deleteTaskInternal(this.taskId); }
  undo(): void { if (this.task) this.app.restoreTask(this.task); }
  getDescription(): string { return `Delete Task: ${this.taskId}`; }
}

// Command History (Undo/Redo)
class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) { command.undo(); this.redoStack.push(command); }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) { command.execute(); this.undoStack.push(command); }
  }

  getUndoCount(): number { return this.undoStack.length; }
  getRedoCount(): number { return this.redoStack.length; }
}

// Event Bus (Pub/Sub)
type EventType = 'TASK_ADDED' | 'TASK_REMOVED' | 'TASK_TOGGLED';

class EventBus {
  private listeners: Map<EventType, Set<Function>> = new Map();

  on(event: EventType, handler: Function): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event: EventType, payload?: unknown): void {
    this.listeners.get(event)?.forEach(handler => handler(payload));
  }
}

// Analytics Service
class AnalyticsService {
  private events: Array<{ event: string; timestamp: number }> = [];

  track(event: string): void {
    this.events.push({ event, timestamp: Date.now() });
  }

  getStats(): { total: number; completed: number; rate: number } {
    const total = this.events.filter(e => e.event === 'TASK_ADDED').length;
    const completed = this.events.filter(e => e.event === 'TASK_TOGGLED').length;
    return { total, completed, rate: total > 0 ? (completed / total) * 100 : 0 };
  }
}

// Particle System (WebGL Canvas)
class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }> = [];
  private animationId?: number;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawn(x: number, y: number, count = 50): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        size: Math.random() * 4 + 2,
      });
    }
    if (!this.animationId) this.animate();
  }

  private animate(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02;
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      if (p.life <= 0) this.particles.splice(i, 1);
    });
    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = undefined;
    }
  }
}

// Main Todo App
class TodoApp {
  private tasks: Task[] = [];
  private history: CommandHistory;
  private eventBus: EventBus;
  private analytics: AnalyticsService;
  private particles: ParticleSystem;

  constructor() {
    console.log('🎯 Rufio\'s Freaky Friday - Todo App Loaded');
    this.history = new CommandHistory();
    this.eventBus = new EventBus();
    this.analytics = new AnalyticsService();
    this.particles = new ParticleSystem();
  }

  addTask(title: string, priority?: Priority): void {
    this.history.execute(new AddTaskCommand(this, title, priority || 'MEDIUM'));
    this.eventBus.emit('TASK_ADDED', { title });
    this.analytics.track('TASK_ADDED');
    this.render();
  }

  toggleTask(taskId: string): void {
    this.history.execute(new ToggleTaskCommand(this, taskId));
    this.eventBus.emit('TASK_TOGGLED', { taskId });
    this.analytics.track('TASK_TOGGLED');
    const task = this.tasks.find(t => t.id === taskId);
    if (task?.completed) this.particles.spawn(window.innerWidth/2, window.innerHeight/2, 100);
    this.render();
  }

  deleteTask(taskId: string): void {
    this.history.execute(new DeleteTaskCommand(this, taskId));
    this.eventBus.emit('TASK_REMOVED', { taskId });
    this.analytics.track('TASK_REMOVED');
    this.render();
  }

  undo(): void { this.history.undo(); this.render(); }
  redo(): void { this.history.redo(); this.render(); }

  addTaskInternal(title: string, priority: Priority): void {
    const task: Task = {
      id: crypto.randomUUID() as TaskId,
      title,
      priority,
      status: 'TODO',
      completed: false,
      createdAt: Date.now(),
    };
    this.tasks.push(task);
  }

  removeLastTask(): void { this.tasks.pop(); }

  toggleTaskInternal(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.status = task.completed ? 'DONE' : 'TODO';
      task.completedAt = task.completed ? Date.now() : undefined;
    }
  }

  deleteTaskInternal(taskId: string): Task | undefined {
    const index = this.tasks.findIndex(t => t.id === taskId);
    return index > -1 ? this.tasks.splice(index, 1)[0] : undefined;
  }

  restoreTask(task: Task): void { this.tasks.push(task); }
  getTasks(): Task[] { return [...this.tasks]; }
  
  getStats(): { total: number; completed: number } {
    return { total: this.tasks.length, completed: this.tasks.filter(t => t.completed).length };
  }

  render(): void {
    const list = document.getElementById('task-list')!;
    const stats = this.getStats();
    
    list.innerHTML = this.tasks.map(task => `
      <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <input type="checkbox" ${task.completed ? 'checked' : ''} 
               onchange="window.app.toggleTask('${task.id}')">
        <span class="task-title ${task.priority}">${task.title}</span>
        <span class="priority-badge">${task.priority}</span>
        <button class="delete-btn" onclick="window.app.deleteTask('${task.id}')">🗑️</button>
      </li>
    `).join('');

    document.getElementById('task-count')!.textContent = `${stats.total} tasks`;
    document.getElementById('tasks-completed')!.textContent = stats.completed.toString();
    document.getElementById('completion-rate')!.textContent = 
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) + '%' : '0%';
    document.getElementById('undo-count')!.textContent = this.history.getUndoCount().toString();
    document.getElementById('redo-count')!.textContent = this.history.getRedoCount().toString();

    document.getElementById('empty-state')!.style.display = 
      this.tasks.length > 0 ? 'none' : 'block';
  }
}

// Initialize app
declare global { interface Window { app: TodoApp; } }
window.app = new TodoApp();

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); window.app.undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); window.app.redo(); }
});
