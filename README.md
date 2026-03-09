# 🎯 Rufio's Freaky Friday - Todo App

> An overengineered todo app that proves you CAN make a simple task manager complex.

## ✨ Features

- **Command Pattern** - Every action is undoable/redoable
- **Particle Effects** - Celebrate task completion with sparkles
- **Analytics** - Track your productivity metrics
- **Event Bus** - Pub/Sub architecture for clean communication
- **Priority System** - 5 levels from CRITICAL to TRIVIAL
- **Keyboard Shortcuts** - Ctrl+Z/Y for undo/redo

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 🏗️ Architecture

Built with TypeScript and Vite, featuring:
- Command pattern for undo/redo
- Event bus for decoupled communication
- WebGL particle system for visual feedback
- Type-safe branded types

## 📁 Project Structure

```
rufios-freaky-friday-todo/
├── src/
│   ├── main.ts       # Main application logic
│   └── style.css     # Styles with gradient background
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎨 Themes

The app features a beautiful gold-to-dark gradient background (#C0A062 → #1A1A1A).

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Add task |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

## 🛠️ Build

```bash
npm run build
```

Production files will be in the `dist/` folder.

## 📄 License

MIT

---

*Built with ❤️ and too many design patterns*
