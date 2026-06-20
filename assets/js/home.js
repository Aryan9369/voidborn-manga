/**
 * VOIDBORN — HOME PAGE
 * Loads manga data, renders hero, continue reading, updates, characters
 */

document.addEventListener('DOMContentLoaded', async () => {
  const { fetchData, storage, progress, favorites, timeAgo, estimateReadTime, startCountdown } = window.VB;

  // ── LOAD DATA ───────────────────────────────────────────
  const [manga, chapters, characters] = await Promise.all([
    fetchData('data/manga.json'),
    fetchData('data/chapters.json'),
    fetchData('data/characters.json')
  ]);

  if (!manga || !chapters) return;

  // ── ANNOUNCEMENT BANNER ─────────────────────────────────
  const bannerText = document.getElementById('banner-text');
  if (bannerText && manga.announcement) {
    bannerText.textContent = manga.announcement;
  }

  // ── HERO ─────────────────────────────────────────────────
  document.getElementById('hero-title').textContent = manga.title;
  document.getElementById('hero-tagline').textContent = manga.tagline;
  document.getElementById('hero-synopsis').textContent = manga.synopsis;

  const heroStats = document.getElementById('hero-stats');
  if (heroStats) {
    heroStats.querySelector('.stat-chapters').textContent = chapters.length;
    heroStats.querySelector('.stat-pages').textContent = chapters.reduce((s, c) => s + c.pages, 0);
    const streakData = progress.getStreak();
    heroStats.querySelector('.stat-streak').textContent = streakData.count;
  }

  // Cover image
  const heroCover = document.getElementById('hero-cover');
  if (heroCover) {
    heroCover.src = manga.cover;
    heroCover.alt = manga.title + ' cover';
  }

  // ── LATEST CHAPTER BANNER ────────────────────────────────
  const latest = [...chapters].sort((a, b) => b.number - a.number)[0];
  if (latest) {
    const latestNum = document.getElementById('banner-latest-num');
    const latestTitle = document.getElementById('banner-latest-title');
    const latestLink = document.getElementById('banner-latest-link');
    if (latestNum) latestNum.textContent = `Chapter ${latest.number}`;
    if (latestTitle) latestTitle.textContent = latest.title;
    if (latestLink) latestLink.href = `reader.html?chapter=${latest.slug}`;
  }

  // ── CONTINUE READING ─────────────────────────────────────
  const lastRead = progress.getLastRead();
  const continueSection = document.getElementById('continue-reading');

  if (lastRead && continueSection) {
    const ch = chapters.find(c => String(c.id) === String(lastRead.chapterId));
    if (ch) {
      continueSection.style.display = '';
      document.getElementById('continue-chapter-num').textContent = `Chapter ${ch.number}`;
      document.getElementById('continue-chapter-title').textContent = ch.title;
      document.getElementById('continue-thumb').src = ch.coverImage;
      const pct = Math.round((lastRead.page / lastRead.total) * 100);
      document.getElementById('continue-progress-fill').style.width = pct + '%';
      document.getElementById('continue-progress-label').textContent = `Page ${lastRead.page} of ${lastRead.total} · ${pct}%`;
      document.getElementById('continue-btn').href = `reader.html?chapter=${ch.slug}&page=${lastRead.page}`;
    }
  } else if (continueSection) {
    continueSection.style.display = 'none';
  }

  // ── RECENT UPDATES ────────────────────────────────────────
  const recentList = document.getElementById('recent-chapters-list');
  if (recentList) {
    const recent = [...chapters]
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, 5);

    recentList.innerHTML = recent.map(ch => `
      <a href="reader.html?chapter=${ch.slug}" class="chapter-card" role="listitem">
        <div class="chapter-card-thumb">
          <img src="${ch.coverImage}" alt="Chapter ${ch.number} cover" loading="lazy" width="56" height="80">
        </div>
        <div class="chapter-card-info">
          <div class="chapter-card-num">Chapter ${ch.number}</div>
          <div class="chapter-card-title">${ch.title}</div>
          <div class="chapter-card-meta">
            <span>${VB.timeAgo(ch.releaseDate)}</span>
            <span>·</span>
            <span>${ch.pages} pages</span>
            <span>·</span>
            <span>${VB.estimateReadTime(ch.pages)}</span>
          </div>
        </div>
        <div class="chapter-card-right">
          ${ch.isNew ? '<span class="badge badge-new">New</span>' : ''}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </a>
    `).join('');
  }

  // ── CHARACTER SHOWCASE ─────────────────────────────────────
  const charShowcase = document.getElementById('char-showcase-grid');
  if (charShowcase && characters) {
    const sorted = [...characters].sort((a, b) => b.importance - a.importance).slice(0, 4);
    charShowcase.innerHTML = sorted.map(char => `
      <a href="characters.html#char-${char.id}" class="char-showcase-card" aria-label="${char.name}">
        <img src="${char.avatar}" alt="${char.name}" loading="lazy" width="300" height="400">
        <div class="char-showcase-overlay">
          <div class="char-showcase-name">${char.name}</div>
          <div class="char-showcase-role">${char.role}</div>
        </div>
      </a>
    `).join('');
  }

  // ── ABOUT CREATOR ─────────────────────────────────────────
  if (manga.author) {
    const a = manga.author;
    const elName = document.getElementById('author-name');
    const elHandle = document.getElementById('author-handle');
    const elBio = document.getElementById('author-bio');
    const elAvatar = document.getElementById('author-avatar');
    if (elName) elName.textContent = a.name;
    if (elHandle) elHandle.textContent = a.handle;
    if (elBio) elBio.textContent = a.bio;
    if (elAvatar) { elAvatar.src = a.avatar; elAvatar.alt = a.name; }

    // Social links
    if (a.links) {
      const ghLink = document.getElementById('author-github');
      const twLink = document.getElementById('author-twitter');
      const igLink = document.getElementById('author-instagram');
      if (ghLink && a.links.github) ghLink.href = a.links.github;
      if (twLink && a.links.twitter) twLink.href = a.links.twitter;
      if (igLink && a.links.instagram) igLink.href = a.links.instagram;
    }
  }

  // ── COUNTDOWN ─────────────────────────────────────────────
  if (manga.nextChapterDate) {
    const cd = document.getElementById('countdown-section');
    if (cd) {
      startCountdown(
        manga.nextChapterDate,
        document.getElementById('cd-days'),
        document.getElementById('cd-hours'),
        document.getElementById('cd-mins'),
        document.getElementById('cd-secs')
      );
    }
  }

  // ── NEWSLETTER ─────────────────────────────────────────────
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('.newsletter-input');
      const email = input?.value?.trim();
      if (!email || !email.includes('@')) {
        VB.toast('Please enter a valid email address.', 'error');
        return;
      }
      // Placeholder — in production, send to email service
      VB.toast('✨ Subscribed! You\'ll hear from us every Friday.', 'success');
      input.value = '';
    });
  }

  // ── RANDOM CHAPTER EASTER EGG ─────────────────────────────
  const randomBtn = document.getElementById('random-chapter-btn');
  if (randomBtn && chapters.length) {
    randomBtn.addEventListener('click', () => {
      const ch = chapters[Math.floor(Math.random() * chapters.length)];
      window.location.href = `reader.html?chapter=${ch.slug}`;
    });
  }

  // ── SCROLL ANIMATIONS ─────────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-observe]').forEach(el => observer.observe(el));
});
