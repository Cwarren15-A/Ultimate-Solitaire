# Ultimate Solitaire

A modern, browser-based implementation of classic Klondike Solitaire built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

## 🚀 Features

- **Modern Web Technologies**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Smooth Animations**: Framer Motion for card movements and UI transitions
- **Accessibility First**: WCAG-AA compliant with keyboard navigation and screen reader support
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Game Engine**: Pure TypeScript game logic with undo/redo functionality
- **State Management**: Zustand for efficient game state handling
- **AI-Powered Features**: Optional hints and game assistance (coming soon)

## 🎮 Game Features

- Classic Klondike Solitaire gameplay
- Draw-1 and Draw-3 modes
- Unlimited undo/redo
- Auto-complete detection
- Move counter and timer
- Hint system
- Keyboard shortcuts

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Icons**: Lucide React
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites

- Node.js 20 LTS or higher
- pnpm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ultimate-solitaire.git
cd ultimate-solitaire

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

## 🎯 Project Status

### ✅ Completed
- Core game engine with pure TypeScript logic
- Complete UI implementation with all components
- Accessibility features and keyboard navigation
- Responsive design and animations
- Game state management with undo/redo
- Timer, move counter, and game controls

### 🚧 In Progress
- AI-powered hint system
- Persistent statistics and leaderboards
- Additional game variants (Spider, FreeCell)

### 📋 Planned
- Progressive Web App (PWA) features
- Multiplayer competitions
- Achievement system
- Themes and customization

## 🎮 How to Play

1. **Objective**: Move all cards to the four foundation piles, sorted by suit from Ace to King
2. **Tableau**: Build down in alternating colors (red on black, black on red)
3. **Foundation**: Build up by suit starting with Ace
4. **Stock**: Draw cards to the waste pile (1 or 3 at a time)
5. **Controls**: 
   - Click and drag to move cards
   - Double-click to auto-move to foundations
   - Use keyboard shortcuts for quick actions

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + N`: New Game
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z`: Redo
- `Ctrl/Cmd + H`: Get Hint
- `Space`: Draw from stock
- `Escape`: Cancel current action

## 🏗️ Architecture

The project follows a clean architecture pattern:

- `core/`: Pure TypeScript game logic (framework-agnostic)
- `components/`: Reusable React components
- `lib/`: Utilities, hooks, and store management
- `app/`: Next.js App Router pages and layouts

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic Solitaire implementations
- Built with modern web technologies for optimal performance
- Designed with accessibility and user experience in mind
