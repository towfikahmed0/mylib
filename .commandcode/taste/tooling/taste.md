# Tooling

- Prefers a modern React stack: Vite + React + TypeScript + Tailwind CSS. Confidence: 0.8
- Uses React Router for routing (declarative/`Routes` style) and Firebase via the v10+ Modular SDK (Auth, Firestore). Confidence: 0.75
- Reaches for Zustand for client/UI state (e.g. persisted theme store) and TanStack Query for server/data fetching. Confidence: 0.7
- Favors feature-oriented project layout (e.g. `src/features/*`, `src/components/layout/*`, `src/lib/*`, `src/store/*`, `src/types/*`) with a central `src/types` module for domain interfaces. Confidence: 0.6
- Uses `lucide-react` for icons, Chart.js via `react-chartjs-2` (doughnut/pie/bar) for charts, and DOMPurify to sanitize any HTML rendered through `dangerouslySetInnerHTML`. Confidence: 0.6
