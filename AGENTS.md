## PROJECT: PitchKick — arcade browser football game

> **TEMPORARY STATE (2026-06-12):** Working tree has engine.ts + HomePage.tsx
> restored to the FIRST version (commit bcc71a9, basic 1v1 circles) at the
> user's request "for a moment". The latest full version (TV broadcast camera,
> 4v4, smart switching/shooting) is commit **258c03a**. To return:
> `git restore --source=258c03a -- src/client/game/engine.ts src/client/pages/HomePage.tsx`
> Everything below describes the LATEST version (258c03a), not the working tree.

A FIFA-like top-down football game played in the browser vs the CPU. Fully
client-side, rendered on `<canvas>` with `requestAnimationFrame`. No backend
game state yet (no Stores/queries for gameplay).

### Game architecture
- `src/client/game/engine.ts` — `PitchKickGame` class: the whole game loop,
  physics, input handling (window keydown/keyup), PC AI, and canvas rendering.
  Field is 1050x680 with a 56px margin (`CANVAS_W`/`CANVAS_H` exported).
  Calls a `HudState` listener each frame to push score/time/possession to React.
- `src/client/pages/HomePage.tsx` — hosts the canvas, scoreboard HUD, start
  overlay, GOAL flash, and the controls legend. Instantiates the engine in a
  `useEffect` keyed on `started`/`gameKey`.

### Controls (FIFA PC style)
- Arrows = move, E = sprint, D = shot, S = short pass, A = long pass,
  W = through pass (leads receiver ~110px toward goal), Q = switch player.
- Shot assist (`shootAssisted`): shot always goes toward the CPU goal.
  The VERTICAL arrow held at the moment of pressing D picks the ZONE of
  the frame (Up = top half, desired spot = top corner; Down = bottom
  half; none/horizontal-only = whole frame, desired = center; facing.y
  lean >0.45 fallback when no arrows held). Within the zone, 9 candidate
  y's are sampled and scored: min(clearance,50) + inputPreference*16,
  where clearance = nearest distance of ANY other player (both teams) to
  the ball->target segment minus their radius (distToSegment helper near
  top of engine.ts). Picks the clearest lane so shots steer around
  blockers — user demanded this after shots kept hitting opponents.
- Passes target a real teammate chosen by facing-direction alignment +
  distance preference (short ~220px, long = farthest forward, through ~320px).
  Control follows YOUR pass to the receiver (user-initiated, FIFA-style).
- Switch selection (`switchScore`, lower = better): when CPU has the ball,
  candidates are scored by distance to an INTERCEPT point ~70px ahead of
  the carrier (direction = 50/50 blend of "toward home goal at x=0" and
  carrier velocity), with -55 bonus for goal-side players (p.x < carrier.x-5)
  and +60 penalty for players behind the play (p.x > carrier.x+15).
  Loose ball / own possession: distance to ball position + vel*0.35.
  User demanded this after Q kept picking players above/below the carrier
  instead of the goal-side defender. Hint shows when candidate score +25
  beats controlled's score.
- NO other automatic switching (user explicitly requested this). A hollow ▽
  marker (`switchHint`) shows who Q would select: home ball-owner if not
  controlled, else nearest home player to ball when meaningfully (30px)
  closer than the controlled one. Solid volt ▼ = controlled player.
- If a non-controlled home teammate ends up owning the ball, they stand and
  shield it until the user presses Q to take over.

### Visuals: TV broadcast pseudo-3D camera (v3, user-requested)
- User never wanted pure top-down — wanted FIFA/TV angle. Simulation stays
  flat 2D (x = goal-to-goal, y = depth between touchlines); ONLY rendering
  changed. Projection in engine.ts top: `proj(x,y)` → screen {x,y,s} with
  scale lerp S_FAR=0.56 (far touchline, y=0) → S_NEAR=1.0 (near, y=FIELD_H);
  screenY uses the INTEGRAL of scale so vertical foreshortening is correct.
  PITCH_TOP=116, PITCH_DRAW_H=510, CANVAS_H=700 (CANVAS_W unchanged).
- `drawHumanoid()` now draws UPRIGHT footballers at foot position, scaled
  by depth: two-tone legs (skin + sock + boot) scissor with distance-driven
  `animPhase`, lift on swing, kick pose extends striking leg, arms counter-
  swing (far arm behind torso, near in front), shirt + white shorts, head
  shows back-of-head hair when facing away (facing.y < -0.3), mirror by
  facing.x sign. Body height 44 at scale 1. Markers ▼/▽ at q.y - 50*s.
- Pitch: `projPath()` helper projects polygons; trapezoid grass apron, 12
  converging mow stripes, projected lines/boxes/centre circle (sampled).
- Goals are REAL standing frames: `goalGeom()` posts at (0|FIELD_W,
  goalTop/goalBottom), postH=58*s, net mesh + back structure drawn BEFORE
  players (`drawGoalBack`), posts+crossbar AFTER (`drawGoalFront`).
- Stadium dressing: gradient sky, deterministic crowd dots, PITCHKICK
  hoarding strip above far touchline.
- Ball + players depth-sorted together into one draw list (ball is a
  drawable at depth ball.y); ball drawn with radial gradient, lifted 0.7r.
- Kits: HOME_KIT blue / AWAY_KIT red; HAIR_COLORS/SKIN_TONES vary per player.
- Researched open sprite options earlier: Kenney Sports Pack (CC0, static
  poses), LPC (4-dir 3/4 view) — procedural chosen deliberately.
- Uses ctx.roundRect (Chrome 99+/modern browsers OK).

### Movement feel (tuned for smoothness, v2)
- Inertia: `steer()` lerps velocity toward target (`ACCEL=8`/s); facing
  rotates at max `TURN_RATE=13` rad/s (`faceToward`). AI `moveToward`
  decelerates within 36px of target to prevent orbiting.
- Speeds (slowed from v1): walk 165, sprint 255, teammate 155, CPU chase
  180 / carry 165 / formation 140. Shot power 660, CPU shot 640.

### Gameplay model (current: 4v4)
- Both teams: 4 players in a diamond formation (`FORMATION` fractions in
  engine.ts: defender / 2 mids / forward). Away is x-mirrored.
- You = blue, attack right. Ball owner gets a lime ring.
- Non-controlled teammates hold formation, shifted by ball position
  (`formationTarget`: anchor + ball offset * 0.35x/0.25y).
- CPU AI: carrier dribbles toward left goal, shoots when x < 250, passes to a
  more-advanced open teammate when pressured (<85px); nearest non-carrier
  chases ball with anticipation; rest hold formation. Decisions every 0.45s.
- Possession: nearest player (either team) within CONTROL_DIST grabs ball;
  kicker is excluded for 0.45s after kicking (`lastKicker`/`kickerLock`) so
  passes aren't instantly re-grabbed; lock clears when anyone receives.
- Tackling (fixed twice after user reports; v2 fixed the GEOMETRY, not just
  timers — the dribble used to push the ball ahead of the tackler's facing,
  i.e. straight back into the opponent):
  - On tackle win: winner's `facing` is flipped AWAY from the tackled
    opponent and the ball is placed on that far side.
  - While `stealProtect` > 0 the dribble glues the ball to the feet
    (ahead = r+ball.r-2, snap 0.55) instead of 4px out front (snap 0.3).
  - Hysteresis: current owner retains vs challengers unless challenger is
    7px closer to the ball AND `stealProtect` elapsed (same-team takeovers
    bypass the margin).
  - `stealProtect`: 0.9s after winning a tackle, 0.35s after a clean
    receive. `dispossessed` lockout: 1.2s (loser can't claim at all).
  - `separatePlayers()`: soft circle collision each frame (minD = sum of
    radii - 4) so opponents can't stand inside the carrier.
  - All timers reset on kickoff.
- Ball bounces off all walls except goal mouths (no throw-ins yet).
- 2-minute timer; goals reset to kickoff (conceding team kicks off);
  full-time verdict freezes play.

### NOT YET BUILT (future slices)
- Goalkeepers as distinct entities, offside, fouls, throw-ins/corners.
- Manual player switch key, tackling/slide tackle.
- Difficulty levels, player stats, persistence of results to a Store.

## Comprehensive Project Structure Overview

### 1. PROJECT STRUCTURE

```
/user-app/
├── src/
│   ├── client/                      # React frontend (React 19)
│   │   ├── assets/                  # Images/logos (favicon.svg, modelence.svg)
│   │   ├── components/
│   │   │   ├── ui/                  # Reusable UI components (shadcn-style)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Label.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── LoadingSpinner.tsx    # Custom loading component
│   │   │   ├── Page.tsx              # Page wrapper with header (accepts `seo` prop)
│   │   │   └── Seo.tsx               # Renders <title> via React 19 native metadata
│   │   ├── pages/                    # Route pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── ExamplePage.tsx
│   │   │   ├── PrivateExamplePage.tsx
│   │   │   ├── LogoutPage.tsx
│   │   │   ├── TermsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── lib/
│   │   │   ├── utils.ts              # Utility functions (cn helper)
│   │   │   └── autoLogin.ts          # Sandbox auto-login hook
│   │   ├── router.tsx                # React Router configuration
│   │   ├── seo.config.ts             # Single source of truth for site name / <title>
│   │   ├── index.tsx                 # App entry point
│   │   ├── types.d.ts
│   │   └── index.css
│   │
│   └── server/                       # Node.js backend
│       ├── app.ts                    # Server entry point
│       ├── example/
│       │   ├── index.ts              # Module definition with queries/mutations
│       │   ├── db.ts                 # Database schemas
│       │   └── cron.ts               # Scheduled jobs
│       └── migrations/
│           └── createDemoUser.ts     # Seeds the sandbox demo user
│
├── Configuration Files
│   ├── tsconfig.json                 # TypeScript 
│   ├── vite.config.ts                # Vite bundler config (loads @tailwindcss/vite)
│   └── modelence.config.ts           # Modelence framework config
│
└── package.json                      # Dependencies & scripts
```

### 2. AVAILABLE UI COMPONENTS (SHADCN-STYLE)

All components are custom implementations located in `/user-app/src/client/components/ui/`:

#### Button Component (`/user-app/src/client/components/ui/Button.tsx`)
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon
- **Features**: Forward ref, fully styled with Tailwind, hover/active states
- **Props**: `ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`

#### Input Component (`/user-app/src/client/components/ui/Input.tsx`)
- **Features**: Forward ref, styled with Tailwind
- **Supports**: All standard HTML input attributes
- **Styling**: Border, focus ring, dark mode, placeholder colors

#### Label Component (`/user-app/src/client/components/ui/Label.tsx`)
- **Features**: Semantic label element with peer-disabled states
- **Props**: `LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>`

#### Card Component (`/user-app/src/client/components/ui/Card.tsx`)
- **Subcomponents**: 
  - `Card` - Main container
  - `CardHeader` - Header section with padding
  - `CardTitle` - Title text styling
  - `CardDescription` - Description text styling
  - `CardContent` - Content wrapper
  - `CardFooter` - Footer section

All components use the `cn()` utility function for class merging.

### 3. UTILITY FUNCTIONS

**File**: `/user-app/src/client/lib/utils.ts`

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
- Uses `clsx` for conditional classes
- Uses `tailwind-merge` to prevent class conflicts
- Perfect for merging component classes with custom overrides

### 4. EXISTING FORM PATTERNS

The app already has two working form examples you can reference:

#### LoginForm (`/user-app/src/client/pages/LoginPage.tsx`)
- Email and password fields
- `FormData` API for form submission
- Card-based layout with headers and footers
- Validation and error handling
- Links to signup

#### SignupForm (`/user-app/src/client/pages/SignupPage.tsx`)
- Email, password, confirm password
- Checkbox for terms acceptance
- Success state handling
- Client-side password validation
- Toast error notifications
- `useCallback` hook for form submission
- State management for success state

### 5. APP STRUCTURE & ARCHITECTURE

#### Client Setup (`/user-app/src/client/index.tsx`)
```typescript
- React Query (TanStack) integration
- React Router DOM
- React Hot Toast for notifications
- Suspense boundaries with loading state
- Global error handler
```

#### Router Configuration (`/user-app/src/client/router.tsx`)
- **Public Routes**: Home, Example, Terms, Logout, 404
- **Guest Routes**: Login, Signup (redirects to home if authenticated)
- **Private Routes**: PrivateExamplePage (redirects to login if not authenticated)
- **Route Protection**: 
  - `GuestRoute` component for auth-only pages
  - `PrivateRoute` component for protected pages
  - Redirect with `_redirect` query param to return after login

#### Page Wrapper (`/user-app/src/client/components/Page.tsx`)
- Header with a Home button (left) and either user handle + Logout or a Sign in button (right) — no logo
- Responsive layout with max-width
- Body section with optional loading state
- Accepts a `seo` prop (`{ title?, noindex? }`) that is forwarded to `<Seo />`
  to set the document `<title>` per page (see SEO/TITLE PATTERN below)

### 6. MODULE SYSTEM (Backend)

**File**: `/user-app/src/server/example/index.ts`

Example shows Module pattern with:

```typescript
new Module('example', {
  configSchema: { /* configuration */ },
  stores: [ /* database stores */ ],
  queries: {
    getItem: async (args, { user }) => { /* query logic */ },
    getItems: async (args, { user }) => { /* query logic */ }
  },
  mutations: {
    createItem: async (args, { user }) => { /* mutation logic */ },
    updateItem: async (args, { user }) => { /* mutation logic */ }
  },
  cronJobs: {
    dailyTest: dailyTestCron
  }
})
```

#### Database Pattern (`/user-app/src/server/example/db.ts`)
```typescript
export const dbExampleItems = new Store('exampleItems', {
  schema: {
    title: schema.string(),
    createdAt: schema.date(),
    userId: schema.userId(),
  },
  indexes: []
});
```

### 7. BUILD & DEVELOPMENT

**Scripts** (from package.json):
```bash
npm run dev          # Development server
npm run build        # Production build
npm start            # Start production server
npm test             # Run tests (not configured)
```

**Vite Configuration**:
- Root: `src/client`
- Path alias: `@/` → `./src/`
- Dev server: `0.0.0.0:5173` (allows external access)
- React plugin enabled

### 8. STYLING SETUP

- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. All Tailwind config
  is CSS-first in `src/client/index.css` (`@import "tailwindcss"`, `@theme`,
  `@source`, etc.) — customize the design system there.
- **Color Scheme**: Gray, black, white primary colors; blue, red accents.

### 9. SEO (TITLE, DESCRIPTION, OG TAGS)

- `src/client/seo.config.ts` is the single source of truth for `siteName` and
  the site-wide meta `description`. **You MUST update both fields** as soon as
  the product name is known — they default to the literal string
  `"Empty Project"` and a generic placeholder description, both of which ship
  broken SEO and social previews. Update them on any landing-page task or
  product-rename request.
- `<Seo />` (in `src/client/components/Seo.tsx`) renders `<title>`, the meta
  description, and Open Graph / Twitter card tags from `seoConfig`. It is
  already mounted once at the app root in `src/client/index.tsx`, so every
  page inherits the site-wide defaults automatically.
- Per-page overrides: pass `seo` to `<Page />`, e.g.
  `<Page seo={{ title: 'Sign in' }}>` or
  `<Page seo={{ title: 'Pricing', description: '...' }}>`. Set
  `noindex: true` for auth, terms, and 404 pages.
- Rendered at runtime via React 19 native `<title>` / `<meta>` hoisting; no
  SEO library needed.
- Heading hierarchy: every page must have exactly one `<h1>` and headings
  must descend monotonically (`h1 → h2 → h3`, never skip a level). Skipped
  levels hurt accessibility audits and SEO.

### 10. REUSABLE PATTERNS FOR NEW FEATURES

When adding a new feature, reach for these existing building blocks before
introducing new ones:

1. **Forms**: native `FormData` API, mirroring `LoginPage` / `SignupPage`.
2. **Validation**: Zod on the server (inside module queries/mutations);
   lightweight client-side checks before submit.
3. **UI Components**: `Button`, `Input`, `Label`, `Card` from
   `src/client/components/ui/`. Avoid pulling in external UI libraries.
4. **Page Layout**: wrap routes in `<Page>` (sets header + `<title>` via
   the `seo` prop).
5. **Icons**: `lucide-react`.
6. **Toast Notifications**: `react-hot-toast` for user feedback.
7. **Server State**: `@tanstack/react-query` via `@modelence/react-query`
   helpers (`useQuery`, `useMutation`).
8. **Local State**: standard React hooks (`useState`, `useCallback`,
   `useMemo`, `useRef`). On React 19, prefer ref-as-prop over `forwardRef`
   in any new components.
9. **Styling**: Tailwind classes combined with the `cn()` helper from
   `src/client/lib/utils.ts`.
10. **Backend feature**: add a new `Module` under `src/server/<feature>/`
    following the `example` module shape (`configSchema`, `stores`,
    `queries`, `mutations`, optional `cronJobs`), and register it in
    `src/server/app.ts`.

### Summary

This is a full-stack Modelence framework application with:
- Clean component structure ready for new features
- All necessary UI building blocks already available
- Form handling patterns established
- Database and backend module patterns ready to follow
- Authentication system in place
- TypeScript support throughout
- No external shadcn/ui dependency needed — custom components are already implemented

### 11. MOBILE APP (Expo, optional)

A project may *optionally* include a mobile app alongside the web app. The
template ships an empty `mobile/` folder, but the studio treats the mobile
app as "not yet created" until the marker file
`mobile/.modelence-mobile-enabled` exists. The Mobile tab in the studio shows
a "Create mobile app" CTA in this state.

**Folder layout**

```
project-root/
├── src/server/        # Modelence backend (unchanged)
├── src/client/        # Web client (unchanged)
├── package.json       # Web dependencies (+ postinstall for mobile)
└── mobile/            # Expo / React Native app (shipped but unhooked)
    ├── .modelence-mobile-enabled  # marker file — present once created
    ├── package.json   # Expo's deps (main: "expo-router/entry")
    ├── app.config.js  # Expo config (includes scheme for deep linking)
    ├── index.ts       # configureClient + auth token persistence (side-effect module)
    ├── app/           # Expo Router file-based routes
    │   ├── _layout.tsx          # root layout — SafeAreaProvider, AppProvider, QueryClientProvider, RouteGuard
    │   ├── (auth)/
    │   │   ├── _layout.tsx      # headerless Stack for unauthenticated screens
    │   │   └── sign-in.tsx      # sign-in screen
    │   └── (app)/
    │       ├── _layout.tsx      # headerless Stack for authenticated screens
    │       └── home.tsx         # home screen (requires auth)
    ├── babel.config.js
    └── tsconfig.json
```

**Important rules**

- The studio's "Create mobile app" flow (button or matching free-text prompt)
  scaffolds/installs the Expo app and writes `mobile/.modelence-mobile-enabled`.
  Do NOT write that marker without first installing Expo dependencies — the
  studio assumes mobile is fully usable once the marker is present.
- The mobile app uses **Expo Router 4.x** (file-based routing). The entry
  point is `expo-router/entry` (set in `mobile/package.json`'s `"main"` field).
  Route groups: `(auth)` for unauthenticated screens, `(app)` for protected
  screens. The `RouteGuard` component in `app/_layout.tsx` redirects based on
  `useSession()` — unauthenticated → `/(auth)/sign-in`, authenticated →
  `/(app)/home`. Do not revert to a manual `registerRootComponent` + `App.tsx`
  setup.
- `index.ts` is a side-effect module (imported by `app/_layout.tsx`) that runs
  `configureClient` and rehydrates the auth token from AsyncStorage. It does
  NOT call `registerRootComponent`.
- Keep `mobile/`'s `package.json` and `node_modules` separate from the web
  app's. Metro and Vite cannot share the same dependency tree.
- The Studio sandbox runs `expo start --tunnel` automatically when the user
  opens the Mobile preview tab. **Do not** add a long-running Expo process
  to the root `package.json`'s `dev` script.
- The root `package.json` has a `postinstall` that runs
  `node scripts/postinstall.mjs`. That script re-installs mobile deps whenever
  the marker exists and no-ops otherwise. Do not remove either; do not change
  the script to run unconditionally.
- Optional convenience scripts you may add at the project root:
  `"dev:mobile": "cd mobile && npm run start"`.
- API calls from the mobile app to the Modelence backend should target the
  sandbox URL exposed in the studio preview (set via an env var the user
  configures in `mobile/app.json`'s `extra` field).
- When adding shared logic, prefer plain TypeScript modules under
  `src/shared/` and import them from both the web client and `mobile/App.tsx`.
  Avoid React-DOM-only or Node-only imports in shared code.
