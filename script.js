// ============================================
// script.js — Public Portfolio Renderer
// ============================================

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const LANG_COLORS = {
    'Python':   '#3572A5',
    'C':        '#555555',
    'C#':       '#178600',
    'C++':      '#f34b7d',
    'Java':     '#b07219',
    'JavaScript':'#f1e05a',
    'CSS':      '#563d7c',
    'HTML':     '#e34c26',
    'Markdown': '#083fa1',
    'default':  '#6366f1'
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
        repos:         profileData?.public_repos ?? null,
        followers:     profileData?.followers ?? null,
        contributions: contribTotal,
        languages:     langCount
    };

    // 6. Cache result
    try {
        sessionStorage.setItem(GH_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: stats }));
    } catch (_) { /* ignore */ }

    applyGitHubStats(stats);
}

function applyGitHubStats(stats) {
    const badge = document.getElementById('stats-live-badge');
    const errorEl = document.getElementById('stats-error');
    let anyLive = false;

    function setStatEl(id, value, suffix = '') {
        const el = document.getElementById(id);
        if (!el) return;
        if (value !== null && value !== undefined) {
            animateNumber(el, value, suffix);
            anyLive = true;
        }
    }

    setStatEl('stat-repos', stats.repos);
    setStatEl('stat-followers', stats.followers);
    setStatEl('stat-contributions', stats.contributions);

    if (stats.languages !== null && stats.languages !== undefined) {
        const langEl = document.getElementById('stat-languages');
        if (langEl) { langEl.textContent = stats.languages + '+'; anyLive = true; }
    }

    if (anyLive && badge) badge.style.display = 'flex';
    if (!anyLive && errorEl) {
        errorEl.style.display = 'block';
        // Fall back to data.js defaults
        const fallback = getData().stats || {};
        const el1 = document.getElementById('stat-repos');
        const el2 = document.getElementById('stat-contributions');
        const el3 = document.getElementById('stat-followers');
        if (el1 && el1.textContent === '—') el1.textContent = fallback.repos ?? 7;
        if (el2 && el2.textContent === '—') el2.textContent = fallback.contributions ?? 485;
        if (el3 && el3.textContent === '—') el3.textContent = fallback.followers ?? 3;
    }
}

function animateNumber(el, target, suffix = '') {
    const duration = 1200;
    const start = performance.now();
    const from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (target - from) * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}


function renderPortfolio() {
    const data = getData();

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

    // ── About Meta Email ──────────────────────
    const emailDisplay = document.getElementById('contact-email-display');
    if (emailDisplay && data.contact.email) {
        emailDisplay.href = `mailto:${data.contact.email}`;
        emailDisplay.textContent = data.contact.email;
    }

    // ── Socials ──────────────────────────────
    const footerSocials   = document.getElementById('footer-socials');
    const heroSocials     = document.getElementById('hero-socials');
    const contactSocials  = document.getElementById('contact-socials-display');

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
        if (heroSocials)   heroSocials.innerHTML   = socialHTML;
        if (contactSocials) contactSocials.innerHTML = contactSocialHTML;
    }

    // ── Profile Photo ─────────────────────────
    const photoImg = document.getElementById('hero-photo-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    const profile = data.profile || {};

    const emojiEl = document.getElementById('photo-emoji');
    if (emojiEl && profile.fallbackEmoji) emojiEl.textContent = profile.fallbackEmoji;

    if (profile.photo && photoImg && photoPlaceholder) {
        photoImg.src = profile.photo;
        photoImg.style.display = 'block';
        photoPlaceholder.style.display = 'none';
    } else if (photoImg) {
        photoImg.style.display = 'none';
        if (photoPlaceholder) photoPlaceholder.style.display = 'flex';
    }

    // ── Resume Button ─────────────────────────
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
        if (profile.resumeFile) {
            resumeBtn.href = profile.resumeFile;
            resumeBtn.download = profile.resumeName || 'resume.pdf';
            resumeBtn.style.display = 'inline-flex';
        } else if (profile.resumeUrl) {
            resumeBtn.href = profile.resumeUrl;
            resumeBtn.target = '_blank';
            resumeBtn.removeAttribute('download');
            resumeBtn.style.display = 'inline-flex';
        } else {
            resumeBtn.style.display = 'none';
        }
    }

    // ── About ─────────────────────────────────
    const bio1 = document.getElementById('about-bio1');
    const bio2 = document.getElementById('about-bio2');
    if (bio1) bio1.textContent = data.about.bio1 || '';
    if (bio2) bio2.textContent = data.about.bio2 || '';

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
    if (projectGrid) {
        if (!data.projects || data.projects.length === 0) {
            projectGrid.innerHTML = '<p class="no-projects">No projects yet. Add some from the admin panel!</p>';
        } else {
            projectGrid.innerHTML = data.projects.map(project => {
                const lang = project.language || '';
                const langColor = LANG_COLORS[lang] || LANG_COLORS['default'];
                const langBadge = lang ? `<span class="lang-badge" style="background:${langColor}22; color:${langColor}; border:1px solid ${langColor}44;">● ${escapeHTML(lang)}</span>` : '';
                return `
                    <div class="project-card">
                        <div class="project-img-placeholder ${escapeHTML(project.gradient || 'gradient-1')}">
                            <div class="project-overlay">
                                <a href="${escapeHTML(project.link || '#')}" class="project-overlay-btn" target="_blank" rel="noopener noreferrer">View on GitHub →</a>
                            </div>
                        </div>
                        <div class="project-info">
                            <div class="project-header-row">
                                <h3>${escapeHTML(project.title)}</h3>
                                ${langBadge}
                            </div>
                            <p>${escapeHTML(project.description)}</p>
                            <a href="${escapeHTML(project.link || '#')}" class="view-link" target="_blank" rel="noopener noreferrer">View Project →</a>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // ── Typing Effect ─────────────────────────
    if (data.general.typingTitles && data.general.typingTitles.length > 0) {
        initTypingEffect(data.general.typingTitles);
    }
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
    const navLinks  = document.getElementById('nav-links');
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
        const target = parseInt(el.textContent.replace(/\D/g, ''), 10);
        if (isNaN(target)) return;
        const suffix = el.textContent.replace(/[0-9]/g, '');
        let count = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
            count = Math.min(count + step, target);
            el.textContent = count + suffix;
            if (count >= target) clearInterval(timer);
        }, 20);
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
// 📌 UPGRADE: To receive messages via email directly (no email app needed),
//    sign up free at https://formspree.io, create a form, and paste your
//    endpoint below. Example: 'https://formspree.io/f/xyzabc123'
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xykbbbzn'; // <-- active Formspree endpoint

function initContactForm() {
    const form      = document.getElementById('dynamic-contact-form');
    if (!form) return;
    const submitBtn = document.getElementById('submit-btn');
    const formMsg   = document.getElementById('form-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name    = document.getElementById('contact-name').value.trim();
        const email   = document.getElementById('contact-email').value.trim();
        const message = document.getElementById('contact-message').value.trim();

        if (!name || !email || !message) {
            showFormMsg('Please fill in all fields.', 'error');
            return;
        }

        setLoading(true);

        // ── Path A: Formspree (messages land in your inbox) ──────────────
        if (FORMSPREE_ENDPOINT) {
            try {
                const res = await fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ name, email, message })
                });
                const payload = await res.json();
                setLoading(false);
                if (res.ok) {
                    showFormMsg(`✅ Message sent! I'll get back to you soon, ${escapeHTML(name)}.`, 'success');
                    form.reset();
                } else {
                    const errMsg = payload.errors?.map(e => e.message).join(', ') || 'Something went wrong.';
                    showFormMsg('❌ ' + errMsg, 'error');
                }
            } catch (_) {
                setLoading(false);
                showFormMsg('❌ Network error. Please email me directly.', 'error');
            }
            return;
        }

        // ── Path B: mailto fallback (opens visitor's email app) ──────────
        // Reads your email from data.js automatically
        const toEmail = getData().contact?.email || 'thesiddharthagupta@gmail.com';
        const subject = encodeURIComponent(`[Portfolio] Message from ${name}`);
        const body    = encodeURIComponent(
            `Hi Siddharth,\n\nYou received a new message from your portfolio contact form.\n\n` +
            `Name:    ${name}\nEmail:   ${email}\n\nMessage:\n${message}\n\n— Sent via portfolio contact form`
        );
        const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;

        // Open mailto in a hidden anchor (avoids popup blockers)
        const a = document.createElement('a');
        a.href = mailtoLink;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setLoading(false);
        showFormMsg(
            `✅ Your email app should have opened with the message pre-filled. Just hit Send!`,
            'success'
        );
        form.reset();
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
        anchor.addEventListener('click', function(e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            e.preventDefault();
            const target = document.querySelector(id);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderPortfolio();
    initScrollBehaviors();
    initHamburger();
    initContactForm();
    initSmoothScroll();

    // Fetch live GitHub stats (non-blocking)
    const ghUser = (getData().stats || {}).githubUser || 'thesiddharthagupta';
    fetchGitHubStats(ghUser);
});

