# Design System (Observed)

This is a record of what is defined in [src/index.css](src/index.css), [tailwind.config.js](tailwind.config.js), and [index.html](index.html), not a proposed redesign or a claim of complete consistency across every screen. The PRD's glassmorphism guidance is product intent; the implementation below is the evidence.

## Theme Tokens

CSS custom properties are space-separated RGB channels and are exposed through Tailwind colors with alpha support.

| Token | Light (`:root`) | Dark (`data-theme="dark"`) | Sepia (`data-theme="sepia"`) |
| --- | --- | --- | --- |
| `--bg` | `248 250 252` | `9 12 20` | `245 236 217` |
| `--surface` | `255 255 255` | `20 24 35` | `251 244 227` |
| `--surface-muted` | `241 245 249` | `30 35 48` | `235 224 200` |
| `--foreground` | `15 23 42` | `241 245 249` | `58 46 31` |
| `--muted-foreground` | `100 116 139` | `148 163 184` | `124 106 79` |
| `--border` | `226 232 240` | `45 52 68` | `217 201 168` |
| `--glass` | `255 255 255` | `22 27 38` | `251 244 227` |
| `--accent` | `99 102 241` | `56 189 248` | `160 82 45` |

Accent overrides are defined for `emerald` (`16 185 129`), `rose` (`244 63 94`), `amber` (`245 158 11`), and `sky` (`14 165 233`). The root accent is the default (indigo) value. Legacy aliases such as `--card`, `--primary`, `--secondary`, and `--ring` coexist with the newer tokens.

## Typography

Tailwind maps `font-sans` to Raleway, `font-serif` to Fraunces, and `font-mono` to the UI monospace stack. `index.html` requests Fraunces, Raleway, and Inter from Google Fonts. Inter is linked there but is not a named Tailwind font-family alias in the inspected config. The base body uses Tailwind antialiasing; `.review-body` uses Fraunces with `line-height: 1.8` and `letter-spacing: 0.01em`.

## Surfaces, Shape, and Elevation

- `.glass` applies a border, translucent `bg-glass/70`, and `backdrop-blur-xl`.
- `.card-surface` applies `rounded-3xl`, a partially transparent border, `bg-surface`, and the `shadow-glass` utility.
- `shadow-glass` is `0 8px 32px rgb(15 23 42 / 0.08)`.
- Tailwind extends radii with `4xl: 2rem`; components also use Tailwind's built-in rounded utilities directly.
- `dropdown-menu` uses a surface background, border, `rounded-2xl`, and `shadow-xl`. Skeleton blocks have explicit radius utilities.

## Spacing and Components

No spacing scale is customized in the inspected Tailwind config. The CSS defines shared `.card-surface`, `.glass`, and `.skeleton-*` classes; it does not define a separate spacing-token system.

Focus-visible styling uses a two-pixel accent ring and background offset. `safe-bottom`, `no-scrollbar`, `density-relaxed`, and `density-compact` utilities are also defined. Several component styles and tokens are retained under legacy `terra` names.

## Motion

The config defines fade-in, slide-up, and float animations. The CSS additionally includes shimmer/skeleton, slide-up, staggered fade, floating, pulse, gradient, heart-burst, hover-lift, and scroll-reveal-related classes/keyframes. These definitions do not imply each animation is used throughout the app.

## Theme Modes and Application

`tailwind.config.js` sets `darkMode: 'class'`. `index.html` starts with `data-theme="light"` and `data-accent="indigo"`; CSS has explicit light, dark, and sepia token sets. Some selectors use class-based `.dark`/`.sepia`; others use `[data-theme=...]`.

The document defines an initial `theme-color` of `rgb(248 250 252)`.

## Design-System Boundaries

**Implemented:** Tailwind utility configuration, CSS variables, shared surface/skeleton classes, and the initial document theme attributes described above.

**Not present:** shadcn/ui and Radix UI are not declared dependencies. Do not introduce their conventions or claim they are the current component system without an approved dependency change. The PRD's design guidance is not evidence that every described surface, layout, or interaction exists.