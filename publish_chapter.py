#!/usr/bin/env python3
"""
VOIDBORN — Chapter Publisher
==============================
Automates the tedious part of publishing a new chapter: scanning the
chapter folder for page images and writing/updating the corresponding
entry in data/chapters.json — so you never hand-type a pageImages array
or miscount pages again.

USAGE
-----
Run this from the root of your site (where data/ and chapters/ live):

    python3 publish_chapter.py

It will interactively ask you for the chapter number, title, etc.,
then scan chapters/chapter-N/ for images and build the JSON entry
automatically.

You can also run it non-interactively with flags — see --help.

WHAT IT DOES
------------
1. Scans chapters/chapter-N/ for page images (page-001.jpg, page-002.png, etc.)
   - Accepts .jpg, .jpeg, .png, .webp, .svg (any mix)
   - Sorts them naturally so page-2 comes before page-10
2. Detects (or asks for) the cover image
3. Builds/updates the matching entry in data/chapters.json
4. Automatically sets isNew: true on this chapter and isNew: false on
   all others (so only the latest chapter shows the "NEW" badge)
5. Leaves everything else in chapters.json untouched

WHAT IT DOES NOT DO
--------------------
- Does not rename, move, compress, or modify your image files
- Does not touch manga.json (you still update the announcement banner
  / next chapter date yourself — or see --announce flag below)
- Does not run git commands — you still commit & push yourself
"""

import json
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone

# ── CONFIG ──────────────────────────────────────────────────────────
VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'}
CHAPTERS_JSON = Path('data/chapters.json')
CHAPTERS_DIR = Path('chapters')


# ── HELPERS ─────────────────────────────────────────────────────────
def natural_sort_key(path: Path):
    """Sort 'page-2.jpg' before 'page-10.jpg' (not 2,10,3 alphabetic order)."""
    return [int(t) if t.isdigit() else t.lower()
            for t in re.split(r'(\d+)', path.name)]


def find_page_images(chapter_dir: Path):
    """Find all page images in a chapter folder, naturally sorted.
    Excludes anything literally named 'cover.*'."""
    images = [
        p for p in chapter_dir.iterdir()
        if p.is_file()
        and p.suffix.lower() in VALID_EXTENSIONS
        and not p.stem.lower().startswith('cover')
    ]
    images.sort(key=natural_sort_key)
    return images


def find_cover_image(chapter_dir: Path):
    """Look for a file named cover.* in the chapter folder."""
    for ext in VALID_EXTENSIONS:
        candidate = chapter_dir / f'cover{ext}'
        if candidate.exists():
            return candidate
    return None


def load_chapters():
    if not CHAPTERS_JSON.exists():
        print(f"ERROR: {CHAPTERS_JSON} not found. Run this script from your site's root folder.")
        sys.exit(1)
    with open(CHAPTERS_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_chapters(chapters):
    with open(CHAPTERS_JSON, 'w', encoding='utf-8') as f:
        json.dump(chapters, f, indent=2, ensure_ascii=False)
        f.write('\n')


def prompt(text, default=None):
    suffix = f" [{default}]" if default is not None else ""
    if not sys.stdin.isatty():
        # No interactive terminal available (e.g. piped/scripted run) —
        # fall back to the default instead of hanging on input().
        return default
    val = input(f"{text}{suffix}: ").strip()
    return val if val else default


# ── MAIN ────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Scan a chapter folder and auto-generate its chapters.json entry."
    )
    parser.add_argument('--chapter', '-c', type=int, help='Chapter number (e.g. 4)')
    parser.add_argument('--title', '-t', help='Chapter title')
    parser.add_argument('--synopsis', '-s', help='One-line teaser/synopsis')
    parser.add_argument('--tags', help='Comma-separated tags, e.g. "Lore,Reveal"')
    parser.add_argument('--release-date', help='ISO date, e.g. 2026-06-27. Defaults to today.')
    parser.add_argument('--yes', '-y', action='store_true',
                         help='Skip confirmation prompt and write immediately')
    args = parser.parse_args()

    print("=" * 60)
    print(" VOIDBORN — Chapter Publisher")
    print("=" * 60)

    # ── Get chapter number ──────────────────────────────────────
    chapter_num = args.chapter or int(prompt("Chapter number"))
    chapter_dir = CHAPTERS_DIR / f'chapter-{chapter_num}'

    if not chapter_dir.exists():
        print(f"\nERROR: Folder not found: {chapter_dir}")
        print(f"Create it first and put your page images inside, e.g.:")
        print(f"  mkdir -p {chapter_dir}")
        sys.exit(1)

    # ── Scan images ──────────────────────────────────────────────
    pages = find_page_images(chapter_dir)
    cover = find_cover_image(chapter_dir)

    if not pages:
        print(f"\nERROR: No page images found in {chapter_dir}")
        print(f"Expected files like page-001.jpg, page-002.jpg, etc.")
        print(f"Valid extensions: {', '.join(sorted(VALID_EXTENSIONS))}")
        sys.exit(1)

    print(f"\nFound {len(pages)} page(s) in {chapter_dir}:")
    for p in pages:
        print(f"   {p.name}")

    if cover:
        print(f"\nCover image: {cover.name}")
    else:
        print(f"\nWARNING: No cover.* file found in {chapter_dir}")
        print(f"  The chapter card thumbnail will fall back to the first page image.")

    # ── Get metadata ─────────────────────────────────────────────
    chapters = load_chapters()
    existing = next((c for c in chapters if c.get('number') == chapter_num), None)

    if existing:
        print(f"\nChapter {chapter_num} already exists in chapters.json — updating it.")
        default_title = existing.get('title', '')
        default_synopsis = existing.get('synopsis', '')
        default_tags = ', '.join(existing.get('tags', []))
        default_slug = existing.get('slug', f'chapter-{chapter_num}')
        default_id = existing.get('id', chapter_num)
    else:
        print(f"\nChapter {chapter_num} is new — creating it.")
        default_title = ''
        default_synopsis = ''
        default_tags = ''
        default_slug = f'chapter-{chapter_num}'
        default_id = max([c.get('id', 0) for c in chapters], default=0) + 1

    title = args.title if args.title is not None else prompt("Chapter title", default_title)
    synopsis = args.synopsis if args.synopsis is not None else prompt("Synopsis (one or two sentences)", default_synopsis)
    tags_raw = args.tags if args.tags is not None else prompt("Tags (comma-separated)", default_tags)
    tags = [t.strip() for t in tags_raw.split(',') if t.strip()]

    release_date = args.release_date if args.release_date is not None else prompt(
        "Release date (YYYY-MM-DD)",
        datetime.now(timezone.utc).strftime('%Y-%m-%d')
    )
    release_iso = f"{release_date}T00:00:00Z"

    # ── Build paths ──────────────────────────────────────────────
    cover_path = f"chapters/chapter-{chapter_num}/{cover.name}" if cover else \
                 f"chapters/chapter-{chapter_num}/{pages[0].name}"
    page_paths = [f"chapters/chapter-{chapter_num}/{p.name}" for p in pages]

    new_entry = {
        "id": default_id,
        "number": chapter_num,
        "title": title,
        "slug": default_slug,
        "releaseDate": release_iso,
        "pages": len(pages),
        "coverImage": cover_path,
        "synopsis": synopsis,
        "tags": tags,
        "isNew": True,
        "isFeatured": existing.get('isFeatured', False) if existing else False,
        "pageImages": page_paths
    }

    # ── Preview ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(" PREVIEW — this entry will be written to chapters.json")
    print("=" * 60)
    print(json.dumps(new_entry, indent=2))
    print("=" * 60)

    if not args.yes:
        confirm = prompt("\nWrite this to chapters.json? (y/n)", "y")
        if confirm.lower() not in ('y', 'yes'):
            print("Cancelled. Nothing was written.")
            sys.exit(0)

    # ── Update chapters list ────────────────────────────────────
    if existing:
        idx = chapters.index(existing)
        chapters[idx] = new_entry
    else:
        chapters.append(new_entry)

    # Only the newest chapter (by number) should show isNew: true
    max_num = max(c['number'] for c in chapters)
    for c in chapters:
        c['isNew'] = (c['number'] == max_num)

    # Keep the list sorted by chapter number for readability
    chapters.sort(key=lambda c: c['number'])

    save_chapters(chapters)

    print(f"\n✅ Done. {CHAPTERS_JSON} updated.")
    print(f"\nNext steps:")
    print(f"  git add .")
    print(f'  git commit -m "Publish Chapter {chapter_num}: {title}"')
    print(f"  git push")
    print(f"\nThen visit:")
    print(f"  reader.html?chapter={default_slug}")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled.")
        sys.exit(1)
