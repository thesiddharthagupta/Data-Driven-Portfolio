// ============================================
// script.js — Public Portfolio Renderer
// ============================================

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const LANG_COLORS = {
    'Python': '#3572A5',
    'C': '#555555',
    'C#': '#178600',
    'C++': '#f34b7d',
    'Java': '#b07219',
    'JavaScript': '#f1e05a',
    'CSS': '#563d7c',
    'HTML': '#e34c26',
    'Markdown': '#083fa1',
    'default': '#6366f1'
};

// ── GitHub Live Stats ─────────────────────────
const GH_CACHE_KEY = 'gh_stats_cache';
const GH_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchGitHubStats(username) {
    // 1. Check sessionStorage cache to avoid blowing through rate limits
    try {
        const cached = sessionStorage.getItem(GH_CACHE_KEY);
        if (cached) {
            const { ts, data } = JSON.parse(cached);
            if (Date.now() - ts < GH_CACHE_TTL) {
                applyGitHubStats(data);
                return;
            }
        }
    } catch (_) { /* ignore */ }

    // 2. Fetch user profile (repos, followers)
    let profileData = null;
    let contribTotal = null;

    try {
        const profileRes = await fetch(`https://api.github.com/users/${username}`, {
            headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (profileRes.ok) {
            profileData = await profileRes.json();
        }
    } catch (_) { /* API unreachable */ }

    // 3. Fetch contribution count via third-party contributions API
    try {
        const contribRes = await fetch(
            `https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
            { signal: AbortSignal.timeout(8000) }
        );
        if (contribRes.ok) {
            const contribData = await contribRes.json();
            // Sum up all contribution counts for the year
            contribTotal = contribData.total
                ? Object.values(contribData.total).reduce((a, b) => a + b, 0)
                : null;
        }
    } catch (_) { /* Contributions API unreachable */ }

    // 4. Count unique languages across repos
    let langCount = null;
    try {
        const reposRes = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&type=public`,
            { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (reposRes.ok) {
            const repos = await reposRes.json();
            const langs = new Set(repos.map(r => r.language).filter(Boolean));
            langCount = langs.size;
        }
    } catch (_) { /* ignore */ }

    // 5. Build stats object
    const stats = {
        repos: profileData?.public_repos ?? null,
        followers: profileData?.followers ?? null,
        contributions: contribTotal,
        languages: langCount
    };

    // 6. Cache result
    try {
        sessionStorage.setItem(GH_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: stats }));
    } catch (_) { /* ignore */ }

    applyGitHubStats(stats);
}

async function applyGitHubStats(stats) {
    const badge = document.getElementById('stats-live-badge');
    const errorEl = document.getElementById('stats-error');
    const portfolioData = await getData();
    const fallback = portfolioData.stats || { repos: 7, contributions: 485, followers: 3, languages: 5 };
    let anyLive = false;
    let anyFailed = false;

    function setStatEl(id, value, fallbackValue, suffix = '') {
        const el = document.getElementById(id);
        if (!el) return;
        if (value !== null && value !== undefined) {
            animateNumber(el, value, suffix);
            anyLive = true;
        } else {
            el.textContent = fallbackValue + suffix;
            anyFailed = true;
        }
    }

    setStatEl('stat-repos', stats.repos, fallback.repos ?? 7);
    setStatEl('stat-contributions', stats.contributions, fallback.contributions ?? 485);

    const langEl = document.getElementById('stat-languages');
    if (langEl) {
        if (stats.languages !== null && stats.languages !== undefined) {
            langEl.textContent = stats.languages + '+';
            anyLive = true;
        } else {
            langEl.textContent = (fallback.languages ?? 5) + '+';
            anyFailed = true;
        }
    }

    if (anyLive && badge) badge.style.display = 'flex';
    if (anyFailed && errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Some live stats unavailable — using cached data';
    }
}

function animateNumber(el, target, suffix = '') {
    if (!el) return;
    const duration = 1500;
    const start = performance.now();
    // Parse current value, default to 0
    const from = parseInt(el.textContent.replace(/[^\d]/g, ''), 10) || 0;
    
    // Don't animate if target is same as current or not a number
    if (from === target || isNaN(target)) {
        el.textContent = (target || 0) + suffix;
        return;
    }

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic for smoother feel
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (target - from) * eased);
        el.textContent = current + suffix;
        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }
    requestAnimationFrame(tick);
}


async function renderPortfolio() {
    const data = await getData();

    // ── General ──────────────────────────────
    document.title = data.general.pageTitle || 'Siddharth Gupta | Portfolio';
    const tagline = document.getElementById('hero-tagline');
    if (tagline) tagline.textContent = data.general.tagline || '';
    const heroName = document.getElementById('hero-name');
    if (heroName) heroName.textContent = data.general.name || 'Siddharth Gupta';

    // ── Footer ───────────────────────────────
    const footerText = document.getElementById('footer-text-display');
    if (footerText) footerText.textContent = data.footer.copyrightText || `© ${new Date().getFullYear()} Siddharth Gupta`;

    // ── Education ────────────────────────────
    const eduList = document.getElementById('education-list');
    if (eduList) {
        eduList.innerHTML = (data.education || []).map(edu => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="duration">${escapeHTML(edu.duration)}</span>
                    <h3>${escapeHTML(edu.degree)}</h3>
                    <span class="institution">${escapeHTML(edu.school)}</span>
                    <p class="description">${escapeHTML(edu.description)}</p>
                </div>
            </div>
        `).join('');
    }

    // ── Experience ───────────────────────────
    const expList = document.getElementById('experience-list');
    if (expList) {
        expList.innerHTML = (data.experience || []).map(exp => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="duration">${escapeHTML(exp.duration)}</span>
                    <h3>${escapeHTML(exp.role)}</h3>
                    <span class="company">${escapeHTML(exp.company)}</span>
                    <p class="description">${escapeHTML(exp.description)}</p>
                </div>
            </div>
        `).join('');
    }

    // ── Certifications ────────────────────────
    const certificationsList = document.getElementById('certifications-list');
    if (certificationsList) {
        certificationsList.innerHTML = (data.certifications || []).map(cert => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="duration">${escapeHTML(cert.date)}</span>
                    ${cert.image ? `
                        <div class="achievement-image-wrap">
                            <img src="${cert.image}" alt="${escapeHTML(cert.title)}" class="achievement-image">
                        </div>
                    ` : ''}
                    <h3>${escapeHTML(cert.title)}</h3>
                    <span class="company">${escapeHTML(cert.issuer)}</span>
                    ${cert.link && cert.link !== '#' ? `<a href="${escapeHTML(cert.link)}" target="_blank" class="cert-link">View Certificate 🔗</a>` : ''}
                </div>
            </div>
        `).join('');
    }

    // ── About Meta Email ──────────────────────
    const emailDisplay = document.getElementById('contact-email-display');
    if (emailDisplay && data.contact.email) {
        emailDisplay.href = `mailto:${data.contact.email}`;
        emailDisplay.textContent = data.contact.email;
    }

    // ── Socials ──────────────────────────────
    const footerSocials = document.getElementById('footer-socials');
    const heroSocials = document.getElementById('hero-socials');
    const contactSocials = document.getElementById('contact-socials-display');

    if (footerSocials || heroSocials || contactSocials) {
        const socials = data.socials || {};
        const platforms = {
            github: { icon: `<svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`, label: 'GitHub' },
            linkedin: { icon: `<svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`, label: 'LinkedIn' },
            twitter: { icon: `<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.853L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`, label: 'Twitter/X' },
            instagram: { icon: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`, label: 'Instagram' }
        };

        const socialHTML = Object.entries(socials)
            .filter(([, url]) => url && url.length > 5)
            .map(([platform, url]) => {
                const p = platforms[platform];
                if (!p) return '';
                return `<a href="${escapeHTML(url)}" class="social-icon" target="_blank" rel="noopener noreferrer" title="${p.label}">${p.icon}</a>`;
            }).join('');

        const contactSocialHTML = Object.entries(socials)
            .filter(([, url]) => url && url.length > 5)
            .map(([platform, url]) => {
                const p = platforms[platform];
                if (!p) return '';
                return `<a href="${escapeHTML(url)}" class="contact-social-link" target="_blank" rel="noopener noreferrer">${p.icon}<span>${p.label}</span></a>`;
            }).join('');

        if (footerSocials) footerSocials.innerHTML = socialHTML;
        if (heroSocials) heroSocials.innerHTML = socialHTML;
        if (contactSocials) contactSocials.innerHTML = contactSocialHTML;
    }

    // ── Profile Photo ─────────────────────────
    const photoWrap = document.querySelector('.hero-photo-wrap');
    const photoImg = document.getElementById('hero-photo-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    const earthLocationPhoto = document.getElementById('earth-location-photo');
    const earthLocationEmoji = document.getElementById('earth-location-emoji');
    const profile = data.profile || {};
    const shouldShowPhotoFrame = !profile.photoHidden;

    if (photoWrap) {
        photoWrap.style.display = shouldShowPhotoFrame ? '' : 'none';
    }

    const emojiEl = document.getElementById('photo-emoji');
    if (emojiEl && profile.fallbackEmoji) emojiEl.textContent = profile.fallbackEmoji;
    if (earthLocationEmoji && profile.fallbackEmoji) earthLocationEmoji.textContent = profile.fallbackEmoji;

    if (profile.photo && earthLocationPhoto && earthLocationEmoji) {
        earthLocationPhoto.src = profile.photo;
        earthLocationPhoto.style.display = 'block';
        earthLocationEmoji.style.display = 'none';
    } else {
        if (earthLocationPhoto) earthLocationPhoto.style.display = 'none';
        if (earthLocationEmoji) earthLocationEmoji.style.display = 'inline-flex';
    }

    if (shouldShowPhotoFrame && profile.photo && photoImg && photoPlaceholder) {
        photoImg.src = profile.photo;
        photoImg.style.display = 'block';
        photoPlaceholder.style.display = 'none';
    } else if (photoImg) {
        photoImg.style.display = 'none';
        if (photoPlaceholder) photoPlaceholder.style.display = shouldShowPhotoFrame ? 'flex' : 'none';
    }

    // ── Resume Button ─────────────────────────
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
        // Only show and enable if an actual file has been uploaded
        if (profile.resumeFile) {
            resumeBtn.href = profile.resumeFile;
            resumeBtn.download = profile.resumeName || 'resume.pdf';
            resumeBtn.style.display = 'inline-flex';
        } else {
            // Hide if no uploaded file is available
            resumeBtn.style.display = 'none';
            resumeBtn.href = 'javascript:void(0)';
            resumeBtn.removeAttribute('download');
        }
    }

    // ── About ─────────────────────────────────
    const about = data.about || {};
    const bio1 = document.getElementById('about-bio1');
    const bio2 = document.getElementById('about-bio2');
    if (bio1) bio1.textContent = about.bio1 || '';
    if (bio2) bio2.textContent = about.bio2 || '';
    const loc = document.getElementById('about-location');
    if (loc) loc.textContent = about.location || 'Bangalore, India';
    const edu = document.getElementById('about-edu-summary');
    if (edu) edu.textContent = about.education || '';
    const avail = document.getElementById('about-availability');
    if (avail) avail.textContent = about.availability || '';
    const emailMeta = document.getElementById('about-email-meta');
    if (emailMeta) emailMeta.textContent = about.email || '';

    // ── Skills ────────────────────────────────
    const skillsGrid = document.getElementById('skills-grid');
    if (skillsGrid) {
        skillsGrid.innerHTML = (data.about.skills || []).map(skill => `
            <div class="skill-card">
                <div class="skill-icon">${getSkillIcon(skill.title)}</div>
                <h3>${escapeHTML(skill.title)}</h3>
                <p>${escapeHTML(skill.description)}</p>
            </div>
        `).join('');
    }

    // ── Projects ──────────────────────────────
    const projectGrid = document.getElementById('project-grid');
    const seeMoreContainer = document.getElementById('see-more-container');

    if (projectGrid) {
        let projects = [];
        try {
            const supabase = getSupabase();
            const { data: dbProjects, error } = await supabase
                .from('projects')
                .select('*')
                .neq('display_order', -1)
                .order('is_featured', { ascending: false })
                .order('updated_at', { ascending: false });
            if (error) throw error;
            projects = dbProjects && dbProjects.length > 0 ? dbProjects : (data.projects || []);
        } catch (e) {
            console.error('Error loading projects from Supabase, using fallback:', e);
            projects = data.projects && data.projects.length > 0 ? data.projects : [];
        }

        // Final fallback to DEFAULT_DATA if both DB and local state are empty
        if (projects.length === 0 && typeof DEFAULT_DATA !== 'undefined') {
            projects = DEFAULT_DATA.projects || [];
        }

        if (projects.length === 0) {
            projectGrid.innerHTML = '<p class="no-projects">No projects yet. Add some from the admin panel!</p>';
            if (seeMoreContainer) seeMoreContainer.style.display = 'none';
        } else {
            const renderSet = (items) => {
                return items.map(project => {
                    const techStack = project.tech_stack || [];
                    const mainLang = project.language || (techStack.length > 0 ? techStack[0] : '');
                    const langColor = LANG_COLORS[mainLang] || LANG_COLORS['default'];
                    const langBadge = mainLang ? `<span class="lang-badge" style="background:${langColor}22; color:${langColor}; border:1px solid ${langColor}44;">● ${escapeHTML(mainLang)}</span>` : '';
                    const githubLink = project.github_url || '#';
                    const liveLink = project.link || project.github_url || '#';
                    const isLive = !!project.link;
                    const cardId = `idx-card-${project.id || project.title.replace(/\W/g, '-')}`;
                    const thumbnail = project.thumbnail || null;

                    return `
                        <div class="project-card" id="${cardId}" onclick="window.open('${escapeHTML(liveLink)}', '_blank')" style="cursor: pointer;">
                            <div class="project-img-placeholder ${escapeHTML(project.gradient || 'gradient-1')}" id="thumb-${cardId}">
                                ${thumbnail ? `<img src="${thumbnail}" alt="${escapeHTML(project.title)}" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<div class="thumb-skeleton"></div>`}
                                <div class="project-overlay">
                                    <a href="${escapeHTML(githubLink)}" class="project-overlay-btn" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">View Code →</a>
                                </div>
                            </div>
                            <div class="project-info">
                                <div class="project-header-row">
                                    <h3>${escapeHTML(project.title)}</h3>
                                    ${langBadge}
                                </div>
                                <p>${escapeHTML(project.description)}</p>
                                <div class="project-tags">
                                    ${techStack.slice(0, 3).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
                                </div>
                                <div style="display: flex; gap: 10px; align-items: center; margin-top: auto;">
                                    <a href="${escapeHTML(liveLink)}" class="view-link" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${isLive ? 'Live Demo →' : 'View Project →'}</a>
                                    <button class="btn-cover-letter" onclick="event.stopPropagation(); openCoverLetter('${escapeHTML(project.title)}', '${escapeHTML(project.description)}', '${escapeHTML(techStack.join(', '))}', '${escapeHTML(mainLang)}')">
                                        📄 Cover Letter
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            };

            const initialCount = 3;
            projectGrid.innerHTML = renderSet(projects.slice(0, initialCount));

            // Async thumbnail resolution for visible cards (non-blocking)
            if (typeof resolveThumbnail === 'function') {
                projects.slice(0, initialCount).forEach(project => {
                    if (!project.thumbnail) {
                        const cardId = `idx-card-${project.id || project.title.replace(/\W/g, '-')}`;
                        const thumbWrap = document.getElementById(`thumb-${cardId}`);
                        if (!thumbWrap) return;
                        resolveThumbnail(project, true).then(({ thumbnail_url, alt_text }) => {
                            const skeleton = thumbWrap.querySelector('.thumb-skeleton');
                            if (skeleton) {
                                const img = document.createElement('img');
                                img.src = thumbnail_url;
                                img.alt = alt_text;
                                img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                                thumbWrap.replaceChild(img, skeleton);
                            }
                        }).catch(() => { /* silent fail — gradient fallback stays */ });
                    }
                });
            }

            if (projects.length > initialCount) {
                if (seeMoreContainer) seeMoreContainer.style.display = 'flex';
            } else {
                if (seeMoreContainer) seeMoreContainer.style.display = 'none';
            }
        }
    }

    // ── Typing Effect ─────────────────────────
    if (data.general.typingTitles && data.general.typingTitles.length > 0) {
        initTypingEffect(data.general.typingTitles);
    }
}

// ── Cover Letter Logic ──────────────────────
function openCoverLetter(title, desc, tech, lang) {
    const modal = document.getElementById('cover-letter-modal');
    const titleEl = document.getElementById('modal-project-title');
    const contentEl = document.getElementById('cover-letter-content');
    const langEl = document.getElementById('modal-project-lang');

    if (!modal || !contentEl) return;

    titleEl.textContent = title;
    langEl.textContent = lang;
    langEl.style.background = (LANG_COLORS[lang] || LANG_COLORS.default) + '22';
    langEl.style.color = LANG_COLORS[lang] || LANG_COLORS.default;

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const letter = `Date: ${today}

To Whom It May Concern,

I am writing to present my technical project, "${title}", as a testament to my skills and experience as a developer.

In this project, I focused on building a robust solution to ${desc}. By leveraging a modern tech stack including ${tech || lang || 'various technologies'}, I was able to implement ${lang ? 'efficient ' + lang + '-based logic' : 'scalable architecture'} and ensure high performance.

Key Highlights of the Project:
- Purpose: ${desc}
- Technologies Used: ${tech || lang}
- Role: Lead Developer / Architect

This project accurately reflects my problem-solving abilities and my commitment to writing clean, maintainable code. I am confident that the expertise gained through this build makes me a strong candidate for roles requiring ${tech || lang} proficiency.

Thank you for your time and consideration.

Sincerely,
Siddharth Gupta
CSE Student & Technical Specialist`;

    contentEl.textContent = letter;
    modal.style.display = 'block';

    // Close on click outside or X
    const closeBtn = document.getElementById('close-cover-modal');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

function copyCoverLetter() {
    const text = document.getElementById('cover-letter-content').textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Cover letter copied to clipboard! 📋');
    });
}

function downloadCoverLetter() {
    const text = document.getElementById('cover-letter-content').textContent;
    const title = document.getElementById('modal-project-title').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_Cover_Letter.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getSkillIcon(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('language')) return '💻';
    if (t.includes('tool') || t.includes('tech')) return '🛠️';
    if (t.includes('cs') || t.includes('algorithm') || t.includes('data')) return '🧠';
    if (t.includes('professional') || t.includes('support')) return '🤝';
    if (t.includes('web')) return '🌐';
    if (t.includes('ai') || t.includes('ml')) return '🤖';
    return '⭐';
}

// ── Typing Animation ──────────────────────────
let typingInstance = { timer: null, currentIndex: 0, charIndex: 0, isDeleting: false };

function initTypingEffect(titles) {
    if (typingInstance.timer) clearTimeout(typingInstance.timer);
    typingInstance = { timer: null, currentIndex: 0, charIndex: 0, isDeleting: false };

    const el = document.getElementById('typewriter');
    if (!el) return;

    function type() {
        const current = titles[typingInstance.currentIndex];
        if (!current) return;
        typingInstance.isDeleting ? typingInstance.charIndex-- : typingInstance.charIndex++;
        el.textContent = current.substring(0, typingInstance.charIndex);
        let speed = typingInstance.isDeleting ? 50 : 100;
        if (!typingInstance.isDeleting && typingInstance.charIndex === current.length) {
            speed = 2000; typingInstance.isDeleting = true;
        } else if (typingInstance.isDeleting && typingInstance.charIndex === 0) {
            typingInstance.isDeleting = false;
            typingInstance.currentIndex = (typingInstance.currentIndex + 1) % titles.length;
            speed = 500;
        }
        typingInstance.timer = setTimeout(type, speed);
    }
    type();
}

// ── Auto-refresh on admin save ────────────────
window.addEventListener('storage', (e) => {
    if (e.key === 'portfolio_data') renderPortfolio();
});

// ── Scroll behaviors ──────────────────────────
function initScrollBehaviors() {
    const navbar = document.getElementById('navbar');
    const scrollTopBtn = document.getElementById('scroll-top');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[data-section]');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Navbar shrink
        if (navbar) navbar.classList.toggle('scrolled', scrollY > 80);

        // Scroll-to-top visibility
        if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', scrollY > 400);

        // Active nav link
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (scrollY >= sectionTop) current = section.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-section') === current);
        });
    });
}

// ── Hamburger Menu ────────────────────────────
function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (!hamburger || !navLinks) return;
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        navLinks.classList.toggle('open');
    });
    // Close on nav link click
    navLinks.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            hamburger.classList.remove('open');
            navLinks.classList.remove('open');
        });
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') && !hamburger.contains(e.target) && !navLinks.contains(e.target)) {
            hamburger.classList.remove('open');
            navLinks.classList.remove('open');
        }
    });
}

// ── Animate Stats Counter ─────────────────────
function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(el => {
        const text = el.textContent.trim();
        const target = parseInt(text.replace(/[^\d]/g, ''), 10);
        if (isNaN(target)) return;
        const suffix = text.replace(/[0-9]/g, '');
        // Use the unified smooth animation function
        animateNumber(el, target, suffix);
    });
}

// ── Intersection Observer for counter ────────
function initCounterAnimation() {
    const statsBar = document.querySelector('.stats-bar');
    if (!statsBar) return;
    let animated = false;
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !animated) {
            animated = true;
            animateCounters();
        }
    }, { threshold: 0.5 });
    observer.observe(statsBar);
}

// ── Contact Form ──────────────────────────────
function initContactForm() {
    const form = document.getElementById('dynamic-contact-form');
    if (!form) return;
    const submitBtn = document.getElementById('submit-btn');
    const formMsg = document.getElementById('form-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const message = document.getElementById('contact-message').value.trim();

        if (!name || !email || !message) {
            showFormMsg('Please fill in all fields.', 'error');
            return;
        }

        setLoading(true);

        try {
            const supabase = getSupabase();
            const { error } = await supabase
                .from('contact_messages')
                .insert([{ name, email, message }]);

            setLoading(false);

            if (error) {
                console.error('Supabase contact error:', error);
                showFormMsg('❌ Failed to send message. Please try again.', 'error');
            } else {
                // Send email using EmailJS only if DB insert succeeds and SDK is loaded
                if (typeof emailjs !== 'undefined') {
                    try {
                        await emailjs.send("service_j0wbcon", "template_kpujbj8", {
                            name: name,
                            email: email,
                            message: message,
                            title: "Portfolio Contact Form",
                            time: new Date().toLocaleString()
                        });
                    } catch (emailErr) {
                        console.error('EmailJS error:', emailErr);
                    }
                } else {
                    console.warn('EmailJS SDK not loaded, skipping email notification.');
                }

                showFormMsg(`✅ Message sent! I'll get back to you soon, ${escapeHTML(name)}.`, 'success');
                form.reset();
            }
        } catch (err) {
            console.error('Contact form submission error:', err);
            setLoading(false);
            showFormMsg('❌ Network error. Please email me directly.', 'error');
        }
    });

    function setLoading(on) {
        submitBtn.classList.toggle('loading', on);
        submitBtn.disabled = on;
    }
    function showFormMsg(text, type) {
        formMsg.textContent = text;
        formMsg.className = `form-message ${type === 'success' ? 'msg-success' : 'msg-error'}`;
        setTimeout(() => { formMsg.textContent = ''; formMsg.className = 'form-message'; }, 7000);
    }
}


// ── Smooth Scroll ─────────────────────────────
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            e.preventDefault();
            const target = document.querySelector(id);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await renderPortfolio();
    initScrollBehaviors();
    initHamburger();
    initContactForm();
    initSmoothScroll();

    // Initialize Neural Grid Background
    if (typeof NeuralGrid !== 'undefined') {
        new NeuralGrid('neural-canvas', { showGlobe: true });
    }

    // Fetch live GitHub stats (non-blocking)
    const ghUser = ((await getData()).stats || {}).githubUser || 'thesiddharthagupta';
    fetchGitHubStats(ghUser);
});
