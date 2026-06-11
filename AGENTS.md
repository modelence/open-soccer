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
