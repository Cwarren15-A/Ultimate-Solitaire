# Klondike Solitaire Web App

A modern, browser‑based implementation of classic Klondike Solitaire designed for fast play, optional AI assistance, and easy extension to additional card games. The project is built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Framer Motion** and is meant to be developed in **VS Code** with **GitHub Copilot**. All assets and code are 100 % original or properly licensed to avoid intellectual‑property issues.

---

## 0. Prerequisites

| Tool        | Min Version | Notes                                              |
| ----------- | ----------- | -------------------------------------------------- |
| **Node.js** | 20 LTS      | ES2022, ESM modules enabled                        |
| **pnpm**    | 9           | Faster installs & workspace support                |
| **VS Code** | 1.90        | Install GitHub Copilot & Tailwind CSS IntelliSense |
| **Git**     | 2.45        | SSH keys set up for GitHub                         |

> **Environment variables** (create `.env.local`)
>
> ```bash
> # OpenAI
> OPENAI_API_KEY=sk‑…
> OPENAI_MODEL=o4‑mini
> # Analytics (optional)
> POSTHOG_KEY=phc_…
> ```

---

## 1. Project Kick‑off *(≈ 30 min)*

1. **Initialize repo & skeleton**
   ```bash
   pnpm create next@latest solitaire-web --ts --tailwind --eslint --app
   cd solitaire-web
   pnpm i framer-motion zustand @tanstack/react-query
   git init && git remote add origin git@github.com:<your‑org>/solitaire-web.git
   ```
2. **Commit early**: `git add -A && git commit -m "feat: scaffold"`
3. **Enable GitHub Actions CI** using the default Node.js workflow; adjust to `pnpm install && pnpm build`.

---

## 2. Domain Models & Game Engine

| Concept | Interface                                                  |       |       |                                       |
| ------- | ---------------------------------------------------------- | ----- | ----- | ------------------------------------- |
| `Card`  | \`{ id: string; suit: "♠︎"                                 | "♥︎"  | "♦︎"  | "♣︎"; rank: 1‑13; faceUp: boolean }\` |
| `Pile`  | union of `TableauPile`, `FoundationPile`, `Stock`, `Waste` |       |       |                                       |
| `Move`  | `{ from: PileId; to: PileId; cards: Card[] }`              |       |       |                                       |

> Keep **game rules in pure functions** inside `core/` so the UI layer stays framework‑agnostic.

### 2.1 Dealing Algorithms

- **Draw‑1** & **Draw‑3** variants share the same shuffle routine (Fisher‑Yates) but differ in stock‑draw logic.
- Export `dealNewGame({ drawMode: 1 | 3 }): GameState`.

### 2.2 Undo / Redo & Autocomplete

- Store a **command stack** in Zustand; every valid `Move` pushes a snapshot.
- `undo()` pops, `redo()` pushes into a redo stack.
- `autoComplete()` iteratively promotes obvious foundation moves until blocked.

---

## 3. User Interface

```
app/
 ├─ layout.tsx          // global Tailwind + NavBar
 ├─ page.tsx            // <GameBoard />
 ├─ components/
 │   ├─ GameBoard.tsx   // grid layout
 │   ├─ Pile.tsx        // drop target & animation wrapper
 │   ├─ Card.tsx        // SVG‑based, accessible (<button role="listitem">)
 │   └─ HUD/
 │       ├─ Timer.tsx
 │       ├─ MoveCounter.tsx
 │       ├─ HintButton.tsx
 │       └─ SettingsDrawer.tsx
 └─ lib/
     └─ analytics.ts    // PostHog wrapper (optional)
```

**Accessibility / UX checklist**

- Keyboard & touch parity (`useDraggable`, `useDroppable`).
- Prefer motion‑safe animations.
- WCAG‑AA contrast (Tailwind theme tokens).
- Resize observer → `useZoom()` hook for small screens.

---

## 4. AI‑Powered Features

1. **Game‑state serializer** → `core/serialize.ts` returns a compact JSON snapshot.
2. **/api/hint** route:
   ```ts
   import OpenAI from "openai";
   export const POST = async (req: Request) => {
     const body = await req.json();
     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
     const { choices } = await openai.chat.completions.create({
       model: process.env.OPENAI_MODEL ?? "o4-mini",
       messages: [
         { role: "system", content: "You are a solitaire assistant…" },
         { role: "user", content: JSON.stringify(body) }
       ],
       max_tokens: 100
     });
     return Response.json({ move: choices[0].message.content });
   };
   ```
3. **Hook** `useHint()` calls the route and animates the recommended card.
4. **Rate‑limit** hints per game (e.g., 3 free, then watch an ad or share link).

---

## 5. Persistent Stats & Leaderboard

- **Local Stats**: `localStorage` for win %, streak, best time.
- **Cloud**: integrate Supabase row‑level security tables `games` & `users`.
- Anonymous users → UUID stored in cookie; upgrade on sign‑in.

---

## 6. Extending to Additional Games

1. **Abstract Engine**: isolate movable‑card rules in `core/games/<game>/`.
2. Create separate routes: `/spider`, `/freecell`, `/tri‑peaks`, etc.
3. Re‑use shared components (pile, card) but supply game‑specific context providers.
4. **Legal safety**: design original rule explanations & illustrations, unique background art, and avoid cloning another site’s UX hierarchy.

---

## 7. Performance, SEO & PWA

- `next‑image` for responsive assets.
- `next‑seo` preset for Open Graph cards.
- Register service‑worker via `next‑pwa` for offline play.
- Lighthouse CI budget ≤ 2 s LCP on mobile.

---

## 8. Monetization (final implementation step)

1. Sign up for **Google AdSense** (or EthicalAds).
2. Add `<GooglePublisherTag>` component with props `{ slotId, layout }`.
3. Insert placeholder components at:
   - *Below* HUD on desktop (`sticky bottom‑4` div).
   - *Between* new‑game banner & footer on mobile.
4. Run **PageSpeed Insights**—ensure CLS < 0.1.
5. Verify ads.txt at root before production deploy.

---

## 9. Deployment

```bash
pnpm build && pnpm start # local prod test
pnpm dlx vercel deploy --prod
```

Use Vercel env vars for keys; set `edgeRuntime="experimental"` for AI routes if latency matters.

---

## 10. Licensing & Compliance Checklist

- **Code**: MIT
- **Card Assets**: original SVG deck (create via Figma) or CC0 pack, hosted in `/public/cards/`.
- **Sounds**: CC0 or original.
- Add **Privacy Policy**, **Terms of Service**, and **Cookie Consent** banner.
- Honor DNT header and disable analytics when set.

---

Happy coding! 🚀

