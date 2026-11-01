# ECHO — Emergency Communication

> Accessible, single-tap emergency communication designed to bridge the gap between people in distress, emergency helplines, and family contacts.

ECHO is a privacy-first Progressive Web App (PWA) that allows users to rapidly compose and dispatch structured emergency messages with live GPS coordinates, home landmark details, and preferred communication methods over WhatsApp or SMS, as well as trigger direct phone calls to emergency services.

---

## 🚨 Features

- **Single-Tap Structured Dispatch**: Generates a clear, standardized emergency alert message and opens it in WhatsApp or SMS with recipient numbers pre-filled.
- **Accurate Geolocation & Landmark Fallback**: Automatically captures GPS coordinates and embeds a live Google Maps link. If GPS is unavailable or denied, it falls back to the user's saved home landmark or address.
- **Dedicated Emergency Helplines**:
  - 🚑 **Ambulance** (Default helpline: `102`)
  - 🔥 **Fire** (Default helpline: `101`)
  - 🚓 **Police / General Emergency** (Default helpline: `112`)
  - 🤝 **Woman Helpline** (Default helpline: `1091`)
  - 👶 **Child Helpline** (Default helpline: `1098`)
  - 💊 **Need Medication** (Routes to medical services)
  - Customizable test or regional contact numbers in Settings.
- **Voice Input & Emergency Intent Recognition**:
  - Hands-free voice input via Web Speech API (`en-IN` and `hi-IN`).
  - Intelligent keyword matching identifies the emergency category (e.g., detecting keywords like _"fire"_, _"aag"_, _"accident"_, _"injury"_, _"khoon"_, _"threat"_, _"chori"_).
- **Accessibility & Communication Preferences**:
  - Accommodates speech or hearing impairments with preferred communication modes:
    - _Text only_
    - _Sign / gestures_
    - _I can hear, cannot speak_
  - Automatically embeds the communication preference into the dispatched alert.
- **Sequential Notification Flow**: Step-by-step guidance ensures that after contacting authorities, user is prompted to alert family contacts in sequence.
- **Bilingual Interface**: Full localization support for **English** and **Hindi** (हिन्दी).
- **Progressive Web App (PWA)**:
  - Installable on mobile devices (Android & iOS Add to Home Screen).
  - Standalone mode with safe-area insets.
  - Offline-first caching via Workbox and Service Worker.
- **Privacy & Security**:
  - No backend database or tracking.
  - All profile, contact, and preference data is stored locally in the browser (`localStorage`).

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack React with SSR & hydration)
- **Routing**: [TanStack Router](https://tanstack.com/router) with file-based routing
- **UI Library**: React 19, [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with dark/light theme support
- **State & Storage**: Client-side storage (`localStorage` & `sessionStorage`) + React State
- **PWA**: `vite-plugin-pwa` with Workbox runtime caching
- **Server / Build**: [Nitro](https://nitro.unjs.io/) (configured with Cloudflare module preset) & [Vite](https://vite.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & [@testing-library/react](https://testing-library.com/)

---

## 📁 Project Structure

```text
echo/
├── echo/                  # Lovable project configuration
├── public/                # Static assets, icons, manifest
├── src/
│   ├── components/
│   │   ├── echo/          # ECHO core application & setup UI
│   │   └── ui/            # Reusable UI component primitives (Radix + Tailwind)
│   ├── hooks/             # Custom hooks (speech input, responsive detection)
│   ├── lib/               # Business logic, dictionary, message builder, storage
│   ├── routes/            # TanStack Start file-based route definitions
│   │   ├── __root.tsx     # Root layout with head metadata, fonts, styles
│   │   └── index.tsx      # Main application route
│   ├── test/              # Vitest test suite and setup files
│   ├── pwa.ts             # Service worker registration & environment checks
│   ├── router.tsx         # TanStack router & QueryClient instantiation
│   ├── server.ts          # SSR server entry and error-handling wrapper
│   ├── start.ts           # TanStack Start server middleware setup
│   └── styles.css         # Tailwind v4 theme definitions and font imports
├── vite.config.ts         # Vite and PWA configuration
└── package.json           # Scripts and dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or [Bun](https://bun.sh/)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/rudransh1277-spec/echo_final.git
cd echo_final
npm install
```

### Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port specified in terminal) in your browser.

---

## 🧪 Testing & Code Quality

Run tests:

```bash
# Run unit tests once
npm test

# Run tests in watch mode
npm run test:watch
```

Run linting and formatting:

```bash
# Lint with ESLint
npm run lint

# Format with Prettier
npm run format
```

---

## 📦 Production Build

Build client assets and Nitro server output:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## ⚠️ Important Disclaimer

ECHO is designed to facilitate faster emergency communication through structured messaging and quick dialing. **It does not replace official emergency services.** In an immediate life-threatening crisis where you are able to speak, always call official emergency helplines (such as **112**) directly.
