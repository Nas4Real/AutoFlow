# AutoFlow Studio Design System

## Status

Approved visual source for the Studio redesign. This document is derived from the supplied Superdesign references:

- [Video Projects Dashboard](https://autoflow-studio-reva.superdesign.cloud/)
- [Video Project Workspace](https://autoflow-studio-reva.superdesign.cloud/autoflow-studio-refined-production-works)

It defines the target visual language for future extension UI work. The first implementation scope is limited to those two Studio surfaces; the extension side panel is intentionally out of scope.

## Product model

Studio is the primary full-page production workspace. The side panel remains a legacy fallback.

- A channel contains video projects.
- A video project is created from an imported prompt JSON file.
- Dashboard shows all projects for a channel.
- Opening a project enters that project's workspace.
- Image generation and video generation remain separate manual, credit-spending checkpoints.
- Project completion phases are: **Imported → Image Generation → Image Selection → Video Generation → Complete**.

## Navigation

### Persistent Studio rail

Use a compact, fixed left rail on desktop. Its visual hierarchy is:

1. AutoFlow Studio brand mark
2. Dashboard
3. Imports
4. Video Projects section
   - search field
   - recent/pinned project links
   - `View all projects`
5. Settings anchored at the bottom

Do not use a global selected-video dropdown in the Studio toolbar. Selecting a project from Dashboard or the rail opens its dedicated workspace.

### Project workspace header

The project view has a compact sticky header with:

- `← All Video Projects` back affordance
- project title
- scene count, current phase, and last-updated metadata
- secondary tabs: **Overview, Image Review, Video Queue, Media**

## Tokens

| Role | Token | Reference value |
| --- | --- | --- |
| App background | `--af-bg` | `#0f121a` |
| Navigation background | `--af-nav-bg` | `#0a0c12` |
| Raised surface | `--af-surface` | deep slate, approximately `#111827` / `#0f1419` |
| Border | `--af-border` | `#1e293b` |
| Primary text | `--af-text` | `#ffffff` / `#e2e8f0` |
| Secondary text | `--af-text-muted` | slate `#94a3b8` / `#64748b` |
| Primary action / current phase | `--af-primary` | electric blue `#3b82f6` |
| Primary hover | `--af-primary-hover` | `#60a5fa` |
| Success / completed stage | `--af-success` | emerald `#10b981` |
| Attention / blocked stage | `--af-warning` | amber `#f59e0b` |
| Failure | `--af-danger` | a high-contrast rose/red token |
| Radius | `--af-radius` | 8px for controls, 12px for cards |
| Font | `--af-font-sans` | Poppins, fallback system sans-serif |

Use a solid dark foundation. The reference's restrained, translucent blue surface wash may be used sparingly for active cards and elevated action areas; do not use bright or decorative gradients.

## Typography and spacing

- Poppins 400, 500, 600, and 700.
- One clear `h1` per page; page headings are compact rather than hero-sized.
- Uppercase micro-labels use 10–11px, semibold/bold, generous tracking, and muted slate text.
- Use a 4px spacing grid; normal content spacing should land on 8, 12, 16, 24, or 32px.
- Use tabular numerals for counts, percentages, credit-sensitive progress, and timestamps where available.

## Surfaces and interaction

- Cards have a low-contrast border and quiet elevation, not heavy shadows.
- Cards may lift slightly and brighten their border on hover.
- Buttons are compact, explicit, and text-led. Icon-only actions require accessible labels.
- Active navigation uses a low-opacity blue fill plus blue text/icon; it must remain legible without color alone.
- Every focusable control has a visible blue focus ring.

## Dashboard specification

The Dashboard is a channel-level command center titled **Video Projects**.

### Header controls

- project count
- `Import JSON` primary action
- project search
- filters: All, Ready for action, In progress, Needs attention, Complete
- sort options: Recently updated, Needs attention, Closest to complete

### Project rows/cards

Each project is clickable and includes:

- title/file-derived project name
- scene or prompt count
- last updated time
- overall completion percentage
- current phase and status text
- context-aware primary action
- five-stage milestone indicator

The primary action opens the relevant project tab; it must not spend credits without the separate explicit confirmation in Image Review or Video Queue.

### Milestone states

| Phase | Complete state | Active state | Attention state |
| --- | --- | --- | --- |
| Imported | emerald check | blue current marker | import/validation error label |
| Image Generation | emerald check | blue progress marker | amber/red failed or blocked prompt count |
| Image Selection | emerald check | blue progress marker | amber unselected-scene count |
| Video Generation | emerald check | blue progress marker | amber/red queued/failed job count |
| Complete | emerald check | not applicable | media recovery error label |

The indicator always includes text and never uses color as the only status signal.

## Project Overview specification

The project Overview follows the supplied workspace reference:

1. Header and secondary project tabs
2. Five-phase horizontal milestone tracker
3. Three compact production status cards:
   - Image Generation
   - Variant Selection
   - Video Queue / Video Generation
4. Current active work or attention state
5. Recent activity timeline

The active phase is electric blue, completed phases are emerald with checkmarks, and future phases are outlined slate circles. The Dashboard and project Overview use the same data and phase vocabulary.

## Accessibility and responsive rules

- Keep semantic headings, native buttons, labels, and keyboard navigation.
- Pair semantic color with icons and clear text.
- Make progress understandable in text, for example `5 of 8 scenes selected`.
- At narrow widths, collapse the rail to an icon/menu control and stack project metadata/actions without hiding the active project context.
- Preserve usable layouts at 320px, 768px, 1024px, and 1440px.

## Implementation guardrails

- Use semantic CSS tokens rather than scattered raw colors.
- Share Studio primitives before applying the system to other extension surfaces.
- Do not modify the side panel during the first two-screen slice.
- Do not redesign existing Image Review, Video Queue, or Media in the first slice; project tabs can route to their existing functionality.
- Keep all image/video runtime contracts and manual checkpoints unchanged.
