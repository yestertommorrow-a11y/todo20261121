# Changelog

All changes to the To-Do Tracker (`todo-app/`), newest first. Add an entry for every change made in a session.

Entry format: date, what changed, which files, and anything worth knowing (limits, untested parts).

---

## 2026-11-21

### Heading color: green to pink
- The heading is now pink (`--heading`: `#d6336c` in light mode, a lighter `#f472b6` in dark mode).
- Files: `todo-app/index.html`.
- Pushed to GitHub, so the live site shows the pink heading once Pages rebuilds (usually within a minute or two).

### Heading color: red to green
- The heading is now green (`--heading`: `#2e7d32` in light mode, a lighter `#4cc26a` in dark mode). The CSS variable was renamed from `--brick` to `--heading`.
- Files: `todo-app/index.html`.
- Pushed to GitHub, so the live site shows the green heading once Pages rebuilds (usually within a minute or two).

### GitHub Pages site and redirect page
- Turned on GitHub Pages for the repository (source: branch `main`, folder `/`). The app is at https://yestertommorrow-a11y.github.io/todo20261121/ and the phone mockup at https://yestertommorrow-a11y.github.io/todo20261121/todo-app/mockup.html.
- Added a root `index.html` that redirects to `todo-app/`, so the short address works.
- The site is public. Each visitor's items stay in their own browser.

### Published to GitHub
- `C:\Users\yeste\ccc` is now a git repository on branch `main`, pushed to https://github.com/yestertommorrow-a11y/todo20261121 (a public repository). The first commit contains `todo-app/` and `CHANGELOG.md`.
- Added `.gitignore` (ignores `.claude/`). `CLAUDE.md` is not in the repo because it currently sits in the kopi-loyalty folder.
- Commits in this repo use the name `yestertommorrow-a11y` and GitHub's no-reply email, set locally for this repo only.
- Later changes are not pushed automatically.

### Compact add form
- The add form is smaller so the list starts higher: 38px fields (42px on phones), 14px text on desktop (16px on phones to stop zoom on focus), tighter spacing and padding.
- Layout: line 1 is the item box plus the Add button; line 2 holds priority, deadline, requested by, category, repeat and notes. Desktop fits in 2 lines at about 760px wide or more; narrower windows wrap notes onto a third line. Phones show 4 short rows (two fields per row) instead of about 9.
- Field order is set with CSS `order`, so the HTML order and tab order are unchanged. The category placeholder was shortened to "Category".
- On phones the 🔔 and theme buttons are smaller (40px) and the heading is 22px so they no longer overlap it.
- Files: `todo-app/index.html` (CSS and one placeholder).
- Checked in the preview at about 736px wide and at 375px (phone) in dark mode. Light mode, a wider window and a real phone were not checked.

### Heading: brick red and centered
- The "To-Do Tracker" heading is now solid brick red (`--brick`: `#a63d2f` in light mode, a lighter `#d9604f` in dark mode) instead of the purple gradient, and is centered.
- The header is now a three-column grid, with the heading in the middle and the 🔔 / theme buttons on the right.
- Files: `todo-app/index.html` (CSS only).
- Checked in the preview in dark mode only. Light mode was not looked at. With the 🔔 button showing on a narrow phone, the heading can sit slightly off-center.

### Deadline defaults to today
- New items start with today's date in the deadline field. It is pre-filled on page load and again after adding an item or cancelling an edit. It can still be changed or cleared.
- Files: `todo-app/app.js` (`cancelEdit`, plus one line after `$("cancel").onclick`).
- Side effect: items left with the default deadline show as "due today", then overdue, and trigger reminders. Clear the field for an item with no deadline.
- Checked in the preview: the field showed today, a saved item got today's date, and the field reset to today.
- Security review: no new risk (value comes from the device clock; `normalize()` still validates the format).

### Project docs
- Added `CLAUDE.md` (guidance for future Claude Code sessions: how to run, architecture, the `#demo` storage prefix, the shared `theme` key).
- Added this `CHANGELOG.md`.

---

## Earlier in this project (undated; built in order)

### Galaxy S25 FE mockup
- New `todo-app/mockup.html`: a phone frame (384×832 screen, approximate S25 FE size) around a live iframe of `index.html#demo`, with a status bar, Chrome-style address bar and gesture bar. It seeds six sample items and follows the app's light/dark theme. The phone scales to fit the window.
- `todo-app/app.js`: a `#demo` URL hash now prefixes all storage keys with `demo:` (`NS` constant, used by `load()` and `store()`), so demo data never touches the real list. The `theme` key is not prefixed and is shared.
- Leftover: `.claude/launch.json` (temporary preview-server config, safe to delete).

### Suggested features 1–14
- Items now have a unique `id` and are managed by id; `normalize()` upgrades old or imported items.
- New fields: category (with suggestions), repeat (daily / weekly / monthly), notes.
- Search box, status chips (All / Open / Done / High priority), requester and category filters, and a count line.
- Sorting: open items first, then nearest deadline, then priority.
- Overdue, due-today and due-soon highlighting, plus an in-page alert bar.
- Recurring items: marking one done creates the next copy (next deadline never earlier than today, monthly day clamped); undo removes that copy.
- Delete asks for confirmation and shows an Undo toast; Clear completed also has Undo.
- Export to JSON and CSV (CSV has a BOM and guards against formula injection); import from JSON (merges, so re-importing duplicates items).
- Deadline reminders using the browser Notification API, once a day while the page is open. These are unlikely to work on Android Chrome without installing the app, which was not built (suggestion 15 was excluded).
- Not done by choice: PWA install (15) and cross-device sync (16).

### Mobile and theme
- Light/dark mode toggle with ☀️ / 🌙 icons. The theme is set before first paint, saved in `localStorage`, defaults to the system setting, and updates the browser's `theme-color`.
- Phone layout (640px and below): the table becomes cards, with 16px inputs to stop zoom on focus, 44–48px touch targets and safe-area spacing.

### Look and feel
- Modern colors: indigo/violet gradient accents, rounded cards, priority badges, dark-mode palette.

### Icon buttons
- ✏️ edit, 🗑️ delete, and ✅ done / ↩️ undo replaced the text buttons.

### First drafts
- Edit and Done buttons added.
- First version: a plain HTML/CSS/JavaScript page with item, priority, deadline and requested-by, saved in `localStorage`, no frameworks.
