/**
 * VOIDBORN — CHAPTERS PAGE
 * Grid display, search, sort, favorites, pagination
 */

document.addEventListener('DOMContentLoaded', async () => {
  const { fetchData, storage, favorites, favorites: favs, timeAgo, estimateReadTime, toast } = window.VB;

  const [chapters, manga] = await Promise.all([
    fetchData('data/chapters.json'),
    fetchData('data/manga.json')
  ]);
  if (!chapters) return;

  // ── MANGA IDENTITY (title, cover, tagline) ──────────────
  if (manga) {
    document.title = `Chapters — ${manga.title}`;

    const nameEl = document.getElementById('manga-name-title');
    const coverEl = document.getElementById('manga-mini-cover');
    const taglineEl = document.getElementById('manga-mini-tagline');

    if (nameEl) nameEl.textContent = manga.title;
    if (coverEl) { coverEl.src = manga.cover; coverEl.alt = `${manga.title} cover`; }
    if (taglineEl) taglineEl.textContent = manga.tagline;
  }

  let filtered = [...chapters];
  let sortOrder = 'newest';
  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;

  // ── DOM REFS ───────────────────────────────────────────
  const grid = document.getElementById('chapters-list');
  const searchInput = document.getElementById('chapter-search');
  const sortSelect = document.getElementById('chapter-sort');
  const countEl = document.getElementById('chapters-count');
  const paginationEl = document.getElementById('pagination');

  // ── RENDER ─────────────────────────────────────────────
  function render() {
    // Sort
    filtered = [...chapters].filter(ch => {
      const q = (searchInput?.value || '').toLowerCase();
      if (!q) return true;
      return ch.title.toLowerCase().includes(q)
        || ch.synopsis.toLowerCase().includes(q)
        || String(ch.number).includes(q)
        || (ch.tags || []).some(t => t.toLowerCase().includes(q));
    });

    if (sortOrder === 'newest') {
      filtered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate));
    }

    if (countEl) countEl.textContent = `${filtered.length} chapter${filtered.length !== 1 ? 's' : ''}`;

    // Paginate
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    if (!pageItems.length) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">◌</div>
          <h3>No chapters found</h3>
          <p>Try a different search term.</p>
        </div>`;
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    grid.innerHTML = pageItems.map(ch => {
      const isFav = VB.favorites.isFavorite(ch.id);
      const readProgress = VB.progress.get(ch.id);
      const pct = readProgress ? Math.round((readProgress.page / readProgress.total) * 100) : 0;

      return `
        <div class="ch-list-card-wrapper" data-ch-id="${ch.id}">
          <a href="reader.html?chapter=${ch.slug}" class="ch-list-card" aria-label="Read Chapter ${ch.number}: ${ch.title}">
            <div class="ch-thumb">
              <img src="${ch.coverImage}" alt="" loading="lazy" width="72" height="100">
            </div>
            <div class="ch-info">
              <div class="ch-meta-top">
                <span class="ch-number mono">CH. ${String(ch.number).padStart(3, '0')}</span>
                ${ch.isNew ? '<span class="badge badge-new">NEW</span>' : ''}
                ${ch.tags ? ch.tags.slice(0,2).map(t => `<span class="badge badge-tag">${t}</span>`).join('') : ''}
              </div>
              <div class="ch-title">${ch.title}</div>
              <div class="ch-synopsis">${ch.synopsis}</div>
              <div class="ch-info-row">
                <span class="ch-info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  ${VB.timeAgo(ch.releaseDate)}
                </span>
                <span class="ch-info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  ${ch.pages} pages
                </span>
                <span class="ch-info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${VB.estimateReadTime(ch.pages)}
                </span>
                ${pct > 0 ? `<span class="ch-info-item text-fracture">${pct}% read</span>` : ''}
              </div>
              ${pct > 0 ? `
                <div class="continue-progress mt-2">
                  <div class="progress-track">
                    <div class="progress-fill" style="width:${pct}%"></div>
                  </div>
                </div>` : ''}
            </div>
            <div class="ch-actions">
              <button class="ch-fav-btn ${isFav ? 'active' : ''}" 
                      data-id="${ch.id}" 
                      aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
                      title="Favorite">
                ${isFav ? '★' : '☆'}
              </button>
              <button class="reader-btn ch-share-btn" 
                      data-ch="${ch.number}" 
                      data-title="${ch.title.replace(/"/g,'&quot;')}"
                      aria-label="Share chapter"
                      title="Share">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </a>
        </div>
      `;
    }).join('');

    // Favorite buttons
    grid.querySelectorAll('.ch-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const added = VB.favorites.toggle(id);
        btn.classList.toggle('active', added);
        btn.textContent = added ? '★' : '☆';
        btn.setAttribute('aria-label', added ? 'Remove from favorites' : 'Add to favorites');
        VB.toast(added ? '★ Added to favorites' : 'Removed from favorites');
      });
    });

    // Share buttons
    grid.querySelectorAll('.ch-share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        VB.shareChapter(btn.dataset.title, btn.dataset.ch);
      });
    });

    // Pagination
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (!paginationEl || totalPages <= 1) {
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}" aria-label="Previous page">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += `<span style="color:var(--ink-4);padding:0 4px;">…</span>`;
      }
    }

    html += `
      <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" aria-label="Next page">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ── SEARCH ─────────────────────────────────────────────
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        render();
      }, 200);
    });
  }

  // ── SORT ───────────────────────────────────────────────
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortOrder = sortSelect.value;
      currentPage = 1;
      render();
    });
  }

  // ── RANDOM CHAPTER ─────────────────────────────────────
  const randomBtn = document.getElementById('random-chapter-btn');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      const ch = chapters[Math.floor(Math.random() * chapters.length)];
      window.location.href = `reader.html?chapter=${ch.slug}`;
    });
  }

  // ── INITIAL RENDER ─────────────────────────────────────
  render();
});
