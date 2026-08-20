---
name: JanNetra
description: Governance Intelligence & Decision Support System
colors:
  bg-primary: "#050505"
  bg-secondary: "#0a0a0c"
  bg-card: "rgba(18, 18, 24, 0.85)"
  text-primary: "#ffffff"
  text-secondary: "#a1a1aa"
  risk-low: "#10b981"
  risk-moderate: "#f59e0b"
  risk-high: "#ef4444"
  risk-critical: "#dc2626"
  accent-purple: "#A881FE"
  accent-blue: "#1E90FF"
  accent-cyan: "#00D2FF"
  accent-teal: "#14b8a6"
typography:
  body:
    fontFamily: "'Plus Jakarta Sans', 'Outfit', 'Inter', -apple-system, sans-serif"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
spacing:
  sidebar-width: "260px"
  navbar-height: "64px"
components:
  glass-card:
    backgroundColor: "linear-gradient(145deg, rgba(120, 180, 255, 0.1) 0%, rgba(160, 200, 255, 0.06) 100%)"
    rounded: "{rounded.md}"
    padding: "24px"
  btn-primary:
    backgroundColor: "linear-gradient(135deg, #A881FE 0%, #6419FF 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
  btn-danger:
    backgroundColor: "linear-gradient(135deg, #ef4444, #dc2626)"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
  btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
---

# Design System: JanNetra

## Overview

**Creative North Star: "The Command Center"**

JanNetra is approachable and civic-minded. It softens complex, dense governance data with rounded corners and highly legible typography, ensuring the interface recedes behind the content itself. Luminous neon accents highlight critical risks against deep void backgrounds, creating an authoritative, precise, yet accessible environment for both citizens and officials.

**Key Characteristics:**
- Deep darks providing contrast for illuminated data.
- Glassmorphism for contextual layering and hierarchy.
- Vibrant, unmistakable risk-coding to draw immediate attention to critical issues.
- Soft rounded corners (8px–18px) to temper the starkness of a command center.

## Colors

Luminous neon accents (Electric Purple, Bright Azure) against deep void backgrounds.

### Primary
- **Deep Void Background** (#050505): The foundational base for the entire application, giving it a premium, focused, and uninterrupted canvas.
- **Card Background** (rgba(18, 18, 24, 0.85)): Used for surfaces resting above the void.
- **Electric Purple** (#A881FE): The primary brand and action accent color.

### Neutral
- **Text Primary** (#ffffff): High contrast text for maximum readability.
- **Text Secondary** (#a1a1aa): Used for supporting text, labels, and less critical data.

### Semantic & Risk
- **Risk Low** (#10b981): Verified or safe items.
- **Risk Moderate** (#f59e0b): Uncertain or flagged items requiring attention.
- **Risk High** (#ef4444): Severe problems or fake reports.
- **Risk Critical** (#dc2626): Immediate action required.

**The Semantic Priority Rule.** Use neon risk colors only to convey actual state or severity, never as purely decorative elements.

## Typography

**Body Font:** 'Plus Jakarta Sans', 'Outfit', 'Inter', -apple-system, sans-serif

**Character:** Legible, approachable, and modern, bringing clarity to dense datasets.

### Hierarchy
- **Header/Page Title** (700, 1.75rem): Used for primary page titles, usually carrying a gradient fill.
- **Stat Value** (800, 2rem): Used for critical numerical data in stat cards.
- **Body** (400, 1rem, 1.6): Standard text across the application.
- **Badge/Label** (600, 0.7rem): Uppercase labels with wide tracking (0.05em) for metadata.

## Layout

The system uses a persistent sidebar (260px) and top navbar (64px). The main content area lives in a fluid container maxing out at 1440px with 32px padding, employing flexible CSS grids for dashboards and stat cards. 

## Elevation & Depth

Lifted and luminous. Shadows act as ambient glow (neon purple/blue/red) rather than physical depth, while glassmorphism creates layered structural depth.

### Shadow Vocabulary
- **Card Shadow** (`0 4px 16px rgba(0, 0, 0, 0.25)`): Ambient base depth for surfaces.
- **Primary Glow** (`0 0 24px rgba(168, 129, 254, 0.25)`): Emits from primary actions on hover.

**The Luminous Lift Rule.** Interactive or elevated elements glow with their respective accent or risk color, rather than casting a traditional dark drop shadow.

## Shapes

Soft, approachable geometry. Standard elements use an 8px radius (`sm`), while larger structural cards use 12px (`md`) or 18px (`lg`). Badges are fully pill-shaped (20px).

## Components

Glassy and immaterial. Components feel like frosted overlays, relying on blurs and gradients.

### Buttons
- **Shape:** Soft rounded (8px).
- **Primary:** Linear gradient (Purple to Deep Purple, #A881FE to #6419FF), white text.
- **Hover:** Slight scale up (`translateY(-1px)`), accompanied by a purple ambient glow.
- **Ghost:** Transparent background with an subtle border (`rgba(255, 255, 255, 0.12)`).

### Glass Cards
- **Corner Style:** 12px radius.
- **Background:** `linear-gradient(145deg, rgba(120, 180, 255, 0.1) 0%, rgba(160, 200, 255, 0.06) 100%)`.
- **Blur:** `backdrop-filter: blur(28px) saturate(180%)`.
- **Border:** Delicate inner stroke (`rgba(160, 200, 255, 0.18)`).

### Stat Cards
- **Accent Strip:** A 3px colored bar at the very top (using gradients) matching the semantic risk or category.
- **Internal Spacing:** Relies heavily on the grid structure to group an icon, value, and uppercase label.

### Badges
- **Style:** Pill-shaped (20px radius), uppercase, heavy letter-spacing.
- **Background:** Semi-transparent fill of the semantic risk color (e.g., `rgba(16, 185, 129, 0.12)`).

## Do's and Don'ts

### Do:
- **Do** use the established risk colors for data status (Low, Moderate, High, Critical).
- **Do** apply the `backdrop-filter` effect exclusively to structurally layered containers (like `.glass-card`).

### Don't:
- **Don't** use solid bright colors for large background areas; keep the backdrop deep and void-like.
- **Don't** mix multiple accent gradients on the same screen indiscriminately.
