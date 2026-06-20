# VOIDBORN — Manga Publishing Site

A premium, fully static manga reading platform. No backend, no build step — pure HTML/CSS/JS, deployable straight to GitHub Pages.

## 📂 Project Structure

```
/
├── index.html              Home page
├── chapters.html           Chapter archive (search/sort/paginate)
├── reader.html              Immersive reader
├── characters.html         Character profiles
├── about.html               Story, lore, FAQ
├── 404.html                  Custom not-found page
├── manifest.json            PWA manifest
├── sw.js                      Service worker (offline support)
├── sitemap.xml
├── robots.txt
├── assets/
│   ├── css/                  global.css, home.css, chapters.css, reader.css, pages.css
│   ├── js/                    core.js (shared utils), + one file per page
│   └── images/                covers, character art, icons
├── data/
│   ├── manga.json            Site-wide metadata (title, synopsis, author, FAQ, lore)
│   ├── chapters.json         Chapter list — THE SOURCE OF TRUTH for all chapters
│   └── characters.json       Character roster
└── chapters/
    ├── chapter-1/             cover.svg + page-001.svg … page-NNN.svg
    ├── chapter-2/
    └── chapter-N/
```

## ➕ How to Publish a New Chapter (weekly workflow)

1. **Create the folder**: `chapters/chapter-{N}/`
2. **Add your page images** inside it, named sequentially:
   `page-001.jpg`, `page-002.jpg`, … (or `.png`/`.webp`/`.svg`)
   Add a `cover.jpg` thumbnail too (used in cards).
3. **Add one entry to `data/chapters.json`**:

```json
{
  "id": 4,
  "number": 4,
  "title": "Your Chapter Title",
  "slug": "chapter-4",
  "releaseDate": "2026-06-20T00:00:00Z",
  "pages": 30,
  "coverImage": "chapters/chapter-4/cover.jpg",
  "synopsis": "One or two sentence teaser.",
  "tags": ["Tag1", "Tag2"],
  "isNew": true,
  "isFeatured": false,
  "pageImages": [
    "chapters/chapter-4/page-001.jpg",
    "chapters/chapter-4/page-002.jpg"
  ]
}
```

4. **Set the previous chapter's `isNew` to `false`** (only the latest should show the badge).
5. **Update `manga.json`**:
   - `announcement` → new one-liner banner text
   - `nextChapterDate` → next Friday's ISO date (powers the homepage countdown)
6. **Commit & push.** GitHub Pages serves it immediately — zero build step.

That's it. Chapter numbering, "latest chapter" banner, continue-reading, and the reader's prev/next navigation are all **fully automatic** — driven entirely by `chapters.json`.

## 🧑‍🎨 Adding / Editing Characters

Edit `data/characters.json`. Each character needs an `importance` (1–5, controls homepage showcase ranking + star display) and a hex `color` used for profile theming.

## 🎨 Design System

All design tokens (colors, spacing, type scale, shadows) live in `assets/css/global.css` under `:root`. Change `--fracture` to re-theme the entire accent color site-wide.

## 🧪 Local Preview

Because this uses `fetch()` for JSON, opening `index.html` directly via `file://` will fail (CORS). Run a local static server instead:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🚀 Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: `main` branch, `/ (root)`.
3. Update the canonical URLs in `index.html`, `sitemap.xml`, and `robots.txt` to match your actual GitHub Pages URL if different from `https://aryan9369.github.io/voidborn/`.

## ✅ Features Implemented

- Dark mode by default, fully responsive, mobile-first
- JSON-driven content (zero hardcoded chapters)
- Reader: vertical scroll + page-by-page modes, zoom, fullscreen, keyboard nav, lazy-loaded pages
- LocalStorage: reading progress, bookmarks, favorites, reading streak, recently viewed
- Continue Reading, Random Chapter, Share/Copy Link, Web Share API with clipboard fallback
- Countdown to next chapter, dismissible announcement banner
- PWA: installable, offline-capable via service worker caching
- SEO: sitemap.xml, robots.txt, Open Graph + Twitter Card tags, structured data (JSON-LD), semantic HTML5
- Accessibility: ARIA labels/roles, focus-visible states, reduced-motion support, semantic landmarks
