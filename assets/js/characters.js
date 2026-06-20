/**
 * VOIDBORN — CHARACTERS PAGE
 * Renders character profiles with dynamic color theming
 */

document.addEventListener('DOMContentLoaded', async () => {
  const { fetchData } = window.VB;

  const [characters] = await Promise.all([fetchData('data/characters.json')]);
  if (!characters) return;

  const grid = document.getElementById('characters-grid');
  if (!grid) return;

  const sorted = [...characters].sort((a, b) => b.importance - a.importance);

  grid.innerHTML = sorted.map(char => `
    <article class="char-card" id="char-${char.id}" style="--char-color:${char.color}">
      <div class="char-card-top">
        <div class="char-portrait">
          <img src="${char.avatar}" alt="${char.name}" loading="lazy" width="120" height="160">
        </div>
        <div class="char-header-info">
          <div class="char-importance" aria-label="Importance: ${char.importance} of 5">
            ${Array.from({length:5}, (_,i) => 
              `<span class="importance-star ${i < char.importance ? 'filled' : ''}" aria-hidden="true">★</span>`
            ).join('')}
          </div>
          <h2 class="char-name">${char.name}</h2>
          <span class="char-role-badge" style="border-color: ${char.color}33; background: ${char.color}15; color:${char.color}">${char.role}</span>
          <p class="char-tagline">"${char.tagline}"</p>
          <p class="char-appearance" style="color:${char.color}99">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            First appears in Chapter ${char.firstAppearance}
          </p>
        </div>
      </div>
      <div class="char-card-body">
        <p class="char-desc">${char.description}</p>

        <div class="char-section-label">Traits</div>
        <div class="char-traits">
          ${char.traits.map(t => `<span class="char-trait">${t}</span>`).join('')}
        </div>

        <div class="char-section-label mt-4">Abilities</div>
        <div class="char-abilities">
          ${char.abilities.map(a => `<div class="char-ability">${a}</div>`).join('')}
        </div>

        ${char.relationships && char.relationships.length ? `
          <div class="char-section-label mt-4">Key Relationships</div>
          <div class="char-relationships">
            ${char.relationships.map(r => `
              <div class="char-rel-item">
                <span class="char-rel-name">${r.character}</span>
                <span class="char-rel-type">${r.type}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </article>
  `).join('');

  // ── ANCHOR SCROLL ─────────────────────────────────────────
  const hash = location.hash;
  if (hash) {
    const target = document.querySelector(hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }
});
