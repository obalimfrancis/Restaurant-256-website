# Mr. Tasty

A static marketing site for a neighbourhood grill: menu, order builder, table
reservations, gallery and opening hours. No framework, no runtime dependencies
— just HTML, one compiled stylesheet and one JavaScript file.

## Getting started

```bash
npm install        # installs the Tailwind CLI (dev dependency only)
npm run dev        # rebuilds tailwind.build.css on every change
npm run serve      # serves the folder at http://localhost:5173
```

Opening `index.html` directly from the file system also works — the site has no
build step at runtime and `tailwind.build.css` is committed.

Before committing a CSS change, run the production build:

```bash
npm run build:css  # minified tailwind.build.css
```

## Project structure

```
index.html           the whole site — one page, anchored sections
tailwind.src.css     source of truth for all styling (design tokens + components)
tailwind.build.css   compiled output, committed so the site runs without a build
js/main.js           all behaviour, plain ES2020 in one IIFE
images/              photography and the logo mark
```

Do **not** edit `tailwind.build.css` by hand; it is regenerated from
`tailwind.src.css`.

## The design system

Everything visual is driven by tokens declared in the `@theme` block at the top
of `tailwind.src.css`. Change a token there and it propagates through the whole
site — both to the hand-written component classes and to Tailwind utilities
(`bg-gold`, `text-cream`, `font-display`, …).

| Group    | Tokens                                                        |
| -------- | ------------------------------------------------------------- |
| Surfaces | `--color-ink`, `--color-ink-deep`, `--color-surface{,-2,-3}`   |
| Brand    | `--color-gold`, `--color-gold-soft`, `--color-gold-deep`, `--color-ember` |
| Text     | `--color-cream`, `--color-muted`, `--color-faint`              |
| Feedback | `--color-success`, `--color-danger`                            |
| Type     | `--font-display` (Playfair Display), `--font-body` (Inter)     |
| Scale    | `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-lede` |
| Shape    | `--radius-card`, `--shadow-soft`, `--shadow-lift`, `--shadow-glow` |
| Motion   | `--ease-out-soft`, `--ease-in-out-soft`                        |

Type sizes are fluid (`clamp()`), so there are no font-size breakpoints to keep
in sync. Layout breakpoints live in one place, section 17 of the stylesheet.

The palette is built for a dark room: body text (`--color-muted` on
`--color-ink`) and the gold accents both clear WCAG AA contrast.

## Features

**Ordering.** Every `Add` button on the page carries `data-name` and
`data-price`. One delegated listener picks them all up, so new dishes need no
JavaScript changes. The basket persists in `localStorage` under
`mrtasty.order.v1` and every read is wrapped in `try/catch`, so blocked or
corrupt storage degrades to an empty basket rather than a broken page.

**Menu filtering.** Course tabs follow the ARIA tablist pattern, including
left/right arrow-key roving. Course headings show in the "All" view and hide
when a single course is selected.

**Reservations.** Client-side validation with inline, screen-reader-announced
errors (`aria-invalid` + `aria-describedby`). Fields validate on blur and then
live-correct once touched. The date field is clamped to today through three
months ahead. On success the form is replaced by a confirmation summary.

**Opening hours.** `HOURS` in `js/main.js` is the single source of truth for the
open/closed badge and the "Today" marker. The same hours appear in the
JSON-LD `openingHoursSpecification` in `index.html` — update both together.

**Gallery.** Lightbox with arrow-key navigation, Escape to close, focus trap and
focus restoration.

Also: sticky header that solidifies on scroll, scrollspy nav highlighting,
scroll-reveal animations, animated stat counters, a testimonial rotator that
pauses on hover/focus and when the tab is hidden, toasts, and back-to-top.

## Accessibility

- Skip link, landmark elements and a single `h1`.
- Visible focus ring on every interactive element (`:focus-visible`).
- Dialogs (mobile menu, order drawer, lightbox) set `aria-modal`, trap focus,
  restore focus on close, and close on Escape.
- Scroll locking is reference-counted, so overlapping overlays cannot leave the
  page stuck.
- All motion is disabled under `prefers-reduced-motion: reduce`.
- Scroll-reveal styling is gated behind a `.js` class on `<html>`. An inline
  script in `<head>` sets it before first paint; the script tag's `onerror` and
  a 2.5s watchdog both revoke it, so a missing or broken `main.js` leaves the
  content visible rather than stuck at `opacity: 0`. If you add a `.reveal`
  rule, keep it under the `.js` prefix.
- Images carry `alt` text and intrinsic `width`/`height` to avoid layout shift.

## SEO

`index.html` includes a meta description, canonical URL, Open Graph and Twitter
card tags, and JSON-LD `Restaurant` structured data covering the address, phone
number, price range and opening hours.

## Printing

`@media print` strips the chrome — header, hero, gallery, drawers — and prints
the full menu on white, including any course currently filtered out.

## This is a demo site

Mr. Tasty is a fictional restaurant built as a front-end portfolio piece. Every
business detail is invented, and the site says so in three places:

- a **Demo** chip beside the wordmark in the header,
- a disclosure panel in the footer, stating that the address, phone, hours,
  prices, ratings and reviews are invented and that the forms send nothing,
- `disambiguatingDescription` in the JSON-LD, so the structured data does not
  assert a real business to search engines.

The testimonials section is additionally labelled as sample content.

Invented values, should you ever point this at a real venue: the address
(24 Kingfisher Lane), the phone number (`+1 (555) 012-3344` — the 555 range is
reserved for fiction), the `@mrtasty.example.com` addresses and
`mrtasty.example.com` canonical URL (`example.com` is reserved by RFC 2606),
all dish prices, the 4.9/820 hero rating, the three testimonials, and the stat
counters. Hours live in two places that must stay in sync: `HOURS` in
`js/main.js` and `openingHoursSpecification` in `index.html`.

The reservation, ordering and newsletter forms are deliberately front-end only:
they validate and confirm, but post nothing. If you wire them to a real endpoint,
remove the corresponding sentence from the footer disclosure.
