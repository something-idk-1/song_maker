---
version: alpha
name: MusicMaker-Web-design-system
description: A clean, monochrome production-tool interface anchored on a white canvas with a black primary action color (play button, save button, active toggles) — the same "confident-not-shouting" register as modern SaaS design systems (Cal.com, Linear), applied to a BandLab-style browser DAW. Voltage comes from crisp grid lines, a segmented pill nav, and tight-radius controls rather than from accent color — this build currently uses no color accent at all (pure black/white/gray).
client: Desktop-first web app, fixed 1920x1080 design reference frame. No native app version in this iteration. No left sidebar — header + main canvas + bottom transport bar only.

colors:
  canvas: "#FFFFFF"
  canvas-alt: "#F7F7F9"
  surface: "#FFFFFF"
  surface-soft: "#F3F4F7"
  primary: "#111111"
  primary-active: "#2B2B2B"
  ink: "#111111"
  body: "#3F3F46"
  muted: "#8A8A93"
  muted-soft: "#B4B4BC"
  hairline: "#E4E4E9"
  hairline-strong: "#D0D0D8"
  on-primary: "#FFFFFF"
  success: "#1D9E75"
  warning: "#BA7517"
  error: "#D4453D"
  track-1: "#5B6BD6"
  track-2: "#D6685B"
  track-3: "#3F9E6B"
  track-4: "#B4885B"

typography:
  display-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.2px
  title-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.1px
  numeric:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.2px

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px

components:
  header-bar:
    backgroundColor: "{colors.surface}"
    borderBottom: "1px solid {colors.hairline}"
    height: 56px
    padding: 0 20px
  nav-pill-group:
    backgroundColor: "{colors.surface-soft}"
    rounded: "{rounded.pill}"
    padding: 4px
  nav-pill-active:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    shadow: "0 1px 2px rgba(0,0,0,0.06)"
  nav-pill-inactive:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
  icon-tool-button:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    size: 32px
  icon-tool-button-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    size: 32px
  avatar-circle:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 28px
  transport-bar:
    backgroundColor: "{colors.surface}"
    borderTop: "1px solid {colors.hairline}"
    height: 64px
    padding: 0 20px
  transport-play-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 40px
  segmented-toggle:
    backgroundColor: "{colors.surface-soft}"
    rounded: "{rounded.md}"
    padding: 2px
  segmented-toggle-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  tempo-slider:
    backgroundColor: "{colors.hairline-strong}"
    filledColor: "{colors.primary}"
    thumbColor: "{colors.primary}"
    height: 4px
  bpm-stepper:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.numeric}"
    rounded: "{rounded.md}"
    padding: 4px 10px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 36px
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.full}"
    size: 32px
  piano-roll-grid:
    backgroundColor: "{colors.canvas}"
    gridLineColor: "{colors.hairline}"
    rowLabelColor: "{colors.muted}"
    rowStripeColor: "{colors.canvas-alt}"
  grid-cell-active:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.xs}"
  playhead-cursor:
    backgroundColor: "{colors.primary}"
    width: 1px
  track-header-row:
    backgroundColor: "{colors.surface}"
    borderBottom: "1px solid {colors.hairline}"
    height: 56px
    padding: 0 12px
  mute-solo-button:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    rounded: "{rounded.xs}"
    size: 20px
  mute-solo-button-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xs}"
  pattern-block:
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    height: 40px
    typography: "{typography.caption}"
  pattern-block-reference:
    backgroundColor: transparent
    borderStyle: "1px dashed"
    rounded: "{rounded.sm}"
    height: 40px
---

## Overview

Song Maker (piano roll build) is a clean, monochrome production tool — white canvas (`{colors.canvas}`), black primary action color (`{colors.primary}` — #111111) for the play button, active toggles, and the save button, and quiet gray surfaces (`{colors.surface-soft}` — #F3F4F7) for grouped controls. This build currently uses **no color accent at all** — every previous neon/dark-mode direction has been dropped in favor of a BandLab-style neutral canvas. Color is deliberately deferred (see Known Gaps) — right now the system runs on contrast and weight alone: black fills = active/primary, gray fills = grouped-but-inactive, white + hairline = default.

**Client environment:** Desktop-first web app. Design reference frame is 1920×1080 — this is the canvas size used while laying out the screen in the design tool, not a native resolution lock; the built page is still a normal responsive web app that reflows below 1920px.

**Navigation model:** No left sidebar. Everything lives in two fixed bars: a **header** (top, 56px) and a **transport bar** (bottom, 64px). The piano roll / playlist views share both bars — only the center content of the header and the main canvas change between views.

**Header layout (fixed convention, shared by every screen):**
- Logo/wordmark ("Song Maker"): far top-left corner.
- Center-left zone: view-specific tool cluster (see below — differs between Piano Roll and Playlist).
- Center-right zone: `{component.nav-pill-group}` — two panels only: "플레이리스트" / "피아노 롤" (Channel Rack is excluded from the header — not a nav destination in this build), pill-in-pill style (inactive pill transparent + gray text, active pill white + shadow, matching the pattern used in Cal.com-style nav-pill systems). Each pill also carries a small **maximize** icon (FL Studio: "maximize playlist" / "maximize piano roll") that expands that panel to fill the entire main canvas, temporarily hiding the other panel — this is a view mode, not a navigation destination, so it toggles independently of which pill is selected.
- Far top-right corner: settings gear icon, then profile avatar circle.

**Header center-left zone — per screen (confirmed, FL Studio-equivalent noted):**
- **Piano Roll:** 3 grouped toggle icons, left to right:
  1. **TTKP toggle** ("Typing Keyboard To Piano") — when on, `z x c v` etc. play notes live like a keyboard instrument. FL Studio calls this TTKP.
  2. **Auto-scroll toggle** — when on, the grid auto-scrolls to follow the playhead during playback. FL Studio: "auto scrolling".
  3. **Step-edit toggle** — when on, keyboard shortcuts place/remove notes directly on the grid (typing enters MIDI data). FL Studio: "step edit".
  All three are independent on/off toggles, not a single-select segmented group — more than one can be active at once.
- **Playlist:** a "patterns" button/dropdown that opens the pattern picker (per the reference mock) instead of the 3-toggle cluster — the Playlist view doesn't need TTKP/auto-scroll/step-edit since it arranges existing patterns rather than authoring notes.

**Transport bar layout (fixed convention, shared by every screen):**
- Far left: `{component.transport-play-button}` (black filled circle, 40px).
- Next to play: `{component.segmented-toggle}` — instrument/tool segment (e.g. piano vs. drum input mode) + "+ 추가" add button.
- Center-left: elapsed-time readout (`{typography.numeric}`, e.g. "00:02:90").
- Center-right: "TEMPO" label + `{component.tempo-slider}` + `{component.bpm-stepper}` (directly editable numeric BPM field with up/down arrows).
- Far right: undo `{component.button-icon-circular}`, redo `{component.button-icon-circular}`, then `{component.button-primary}` ("SAVE PROJECT"). No mic/record button in this build.

**Key Characteristics:**
- Monochrome only — black/white/gray. No hue-based accent color is in use yet in the built screens.
- Primary black (`{colors.primary}`) marks "currently active" everywhere: the selected nav pill's icon set is not black-filled (nav pills use white+shadow for active instead), but tool-cluster icons, segmented-toggle selections, and the play/save buttons all use solid black fill as the "this is on / this is the primary action" signal.
- Grid rows in the Piano Roll alternate very subtly between white and `{colors.canvas-alt}` (#F7F7F9) per octave band, and note-name labels (C7, B6, A#6...) sit in a fixed left gutter column in `{colors.muted}` text — always visible, never hidden.
- Border radius stays tight and small (`{rounded.xs}`–`{rounded.md}`) on all controls; only the nav-pill-group and avatar use `{rounded.pill}`/`{rounded.full}`.
- No drop shadows except a very faint one under the active nav pill (`0 1px 2px rgba(0,0,0,0.06)`) — everything else is flat with 1px hairline borders.

## Colors

### Brand & Accent
- **Primary** (`{colors.primary}` — #111111): The only "active" signal color in the system right now. Used for the play button, save button, active segmented-toggle option, and active tool-cluster icons.
- **Track colors** (`{colors.track-1..4}`): Proposed — not yet in the built screens. See "Playlist unification" below for why these should be added.

### Surface
- **Canvas** (`{colors.canvas}` — #FFFFFF): Base page background, piano roll grid background.
- **Canvas Alt** (`{colors.canvas-alt}` — #F7F7F9): Alternating octave-band stripe in the piano roll row labels.
- **Surface Soft** (`{colors.surface-soft}` — #F3F4F7): Nav-pill-group background, segmented-toggle background, bpm-stepper background — the "grouped control" fill.
- **Hairline** (`{colors.hairline}` — #E4E4E9): Header/transport-bar border, grid lines, default control border.
- **Hairline Strong** (`{colors.hairline-strong}` — #D0D0D8): Tempo-slider track fill (unfilled portion).

### Text
- **Ink** (`{colors.ink}` — #111111): Headlines, active labels, primary text.
- **Body** (`{colors.body}` — #3F3F46): Default running text.
- **Muted** (`{colors.muted}` — #8A8A93): Inactive nav-pill text, note-name row labels, inactive tool icons.
- **Muted Soft** (`{colors.muted-soft}` — #B4B4BC): Placeholder text, disabled state.
- **On Primary** (`{colors.on-primary}` — #FFFFFF): Text/icon on top of black-filled controls.

### Semantic
- **Success / Warning / Error**: reserved for save-confirmation toasts and audio-load error states — not yet visible in the built screens but should follow standard green/amber/red conventions when added.

## Typography

Inter across the whole system. `JetBrains Mono` is reserved for numeric readouts only: BPM value and the elapsed-time transport readout, so digits stay tabular and don't jitter as they change during playback.

| Token | Size | Weight | Use |
|---|---|---|---|
| `{typography.display-md}` | 20px | 700 | Logo wordmark |
| `{typography.title-md}` | 15px | 600 | Nav pill labels, track names |
| `{typography.title-sm}` | 13px | 600 | Section labels, pattern block titles |
| `{typography.body-md}` | 14px | 400 | Default running text |
| `{typography.caption}` | 12px | 500 | Row labels (note names), timestamps |
| `{typography.numeric}` | 13px | 500 | BPM readout, elapsed-time readout — JetBrains Mono |
| `{typography.button}` | 13px | 600 | Button labels |

## Layout

### Spacing System
Base unit 4px: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px.

### Grid & Container
- Header: fixed 56px, full width, pinned to top, never scrolls away.
- Transport bar: fixed 64px, full width, pinned to bottom, never scrolls away.
- Piano Roll grid: fills the remaining vertical space between header and transport bar; horizontally and vertically scrollable; note-name gutter column stays fixed/pinned while the grid scrolls horizontally.
- Playlist: left column is a fixed-width track-header rail (`{component.track-header-row}` stacked vertically); right area is the horizontally-scrolling pattern timeline.

## Components

### Header
**`header-bar`** — see Overview for the full left/center/right layout. Shared structure across Piano Roll and Playlist; only the center-left zone content swaps.

**`nav-pill-group`** / **`nav-pill-active`** / **`nav-pill-inactive`** — "플레이리스트" / "피아노 롤" switcher. Directly modeled on the Cal.com-style pill-in-pill nav pattern: gray pill-shaped wrapper, active tab renders as a white pill with a faint shadow inside it.

**`icon-tool-button`** / **`icon-tool-button-active`** — 32px icon-only buttons in the header's center-left zone. Active state = solid black fill + white icon; inactive = transparent + gray icon.

**`avatar-circle`** — 28px circle, black fill, white initial ("U"), top-right corner next to the settings gear.

### Transport Bar
**`transport-play-button`** — 40px black circular button, white play/pause icon, sits at the far left of the bar.

**`segmented-toggle`** / **`segmented-toggle-active`** — Groups the input-mode options (e.g. piano / drum) right next to the play button; active segment gets solid black fill.

**`tempo-slider`** + **`bpm-stepper`** — Slider (gray track, black fill + thumb) paired with a directly-editable numeric stepper field showing the BPM value with up/down arrows.

**`button-icon-circular`** (undo/redo) + **`button-primary`** ("SAVE PROJECT") — anchor the far right of the transport bar.

### Piano Roll
**`piano-roll-grid`** — Note-name gutter column (`{colors.muted}` text, e.g. C#7, C7, B6...) pinned to the left, alternating `{colors.canvas}` / `{colors.canvas-alt}` row stripes per octave, `{colors.hairline}` grid lines.

**`grid-cell-active`** — Solid black filled cell marking a placed note.

**`playhead-cursor`** — 1px black vertical line sweeping across the grid during playback.

### Playlist
**`track-header-row`** — Left-rail row: track name (`{typography.title-md}`) + `{component.mute-solo-button}` pair (M / S). 56px tall, matches the reference screenshot's track list.

**`pattern-block`** — Colored rounded-rect block placed on a track's timeline lane, holding the pattern name (e.g. "Lead Arp A", "808 Deep Loop"). **Currently unstyled/monochrome in the reference screenshot — see Playlist unification below.**

**`pattern-block-reference`** — Dashed-outline variant for "reference/ghost" clips (e.g. "808 Deep Loop (Ref)") that mark a repeated or linked pattern instance rather than an independent one.

## Playlist unification (action items)

The Playlist screen (Stitch-sourced) currently doesn't share the header/transport-bar chrome with the Piano Roll screen, and its pattern blocks aren't color-coded per track. To bring it in line with this system:

1. Apply the same `{component.header-bar}` (logo, nav-pill-group, settings, avatar) and the same `{component.transport-bar}` to the Playlist screen.
2. Color-code `{component.pattern-block}` by track using `{colors.track-1..4}` so a user can tell at a glance which lane a clip belongs to without reading the label.
3. Keep `{component.mute-solo-button}` sizing (20px) consistent, but move to `{colors.primary}` fill for the active/engaged state.
4. Align the playhead cursor's x-position and styling (1px black line) between Piano Roll and Playlist so scrubbing feels like the same timeline in both views.

## Do's and Don'ts

### Do
- Use solid black fill as the single consistent "this is active" signal across nav pills' inner pill (white, not black — the one exception), tool-cluster icons, segmented toggles, and the play/save buttons.
- Keep the note-name gutter column visible at all times in the Piano Roll — never hide it behind a toggle.
- Reuse `{component.header-bar}` and `{component.transport-bar}` unmodified across every new screen added later — only the center content changes.

### Don't
- Don't reintroduce a left sidebar — the whole point of this layout is header + canvas + transport bar only.
- Don't add a hamburger menu — there are only two top-level views (Playlist, Piano Roll) plus settings/profile, which fit directly in the header.
- Don't add a mic/record button to the transport bar in this build (explicitly descoped).
- Don't leave Playlist pattern blocks monochrome — see unification action items above.

## Responsive Behavior

The 1920×1080 frame is the design reference size, not a hard lock. Until a mobile/tablet pass is scoped, treat sub-1280px widths as out of scope for this 3-day build.

## Known Gaps

- **Icon-cluster mapping — confirmed:** TTKP / Auto-scroll / Step-edit, per the FL Studio-equivalent spec above. Still need the actual icon glyphs matched 1:1 once built.
- **Channel Rack scope — confirmed excluded:** header nav stays 2 panels only (Playlist / Piano Roll).
- **Maximize-panel interaction unspecified:** exactly how "maximize playlist" / "maximize piano roll" behaves (does it hide the transport bar too? what un-maximizes it) still needs a quick interaction spec before build.
- **Color accent deferred:** the whole system is currently monochrome by choice. Track colors (`{colors.track-1..4}`) are proposed here only for the Playlist unification fix — confirm before using elsewhere.
- **Save/Share screen (REQ-05)** still has no visual spec — add once that screen is designed.
- Animation timing for the playhead sweep is not yet defined in ms.
