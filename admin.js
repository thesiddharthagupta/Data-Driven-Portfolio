// ============================================
// admin.js — Portfolio Admin Panel Logic
// ============================================

let currentData = null;
let cropper = null;

// ── Initialization ───────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = getSupabase();
    
    // Check initial session as requested
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard();
    } else {
        showLogin();
    }

    // Subscribe to future changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') showDashboard();
        if (event === 'SIGNED_OUT') showLogin();
    });

    initLogin();
    initNavigation();
});

async function showDashboard() {
    currentData = await getData();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    loadDashboard();
    // Restore saved GitHub username
    const savedUser = localStorage.getItem('gh_sync_username');
    if (savedUser) {
        const el = document.getElementById('sync-username');
        if (el) el.value = savedUser;
        setGitHubCredentials(savedUser, '');
    }
    updateSyncUI();
    setInterval(updateSyncUI, 60000); // refresh status every minute

    // Auto Sync on load if username is present
    if (savedUser) {
        // Silently run sync
        runGitHubSync().then(() => {
            updateSyncUI();
            loadProjects();
        }).catch(err => console.error('Auto-sync failed:', err));
    }
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
}

// ── Authentication ───────────────────────────
function initLogin() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const supabase = getSupabase();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            const err = document.getElementById('login-error');
            err.textContent = error.message;
            err.style.display = 'block';
        } else {
            showToast('Login successful!');
            // onAuthStateChange will handle the UI transition
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) alert('Error signing out: ' + error.message);
        // onAuthStateChange handles showLogin()
    });
}

// ── File Management Helpers ──────────────────
async function uploadFile(file, bucket, path) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            upsert: true,
            contentType: file.type
        });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
        
    return publicUrl;
}

// ── Navigation ───────────────────────────────
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.admin-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`section-${sectionId}`);
            if (targetSection) targetSection.classList.add('active');

            // Lazy-load data for dynamic sections
            if (sectionId === 'projects') loadProjects();
            if (sectionId === 'sync')     updateSyncUI();
        });
    });
}

// ── Load Dashboard Data ──────────────────────
function loadDashboard() {
    if (!currentData) return;
    // General
    document.getElementById('gen-name').value = currentData.general.name || '';
    document.getElementById('gen-page-title').value = currentData.general.pageTitle || '';
    document.getElementById('gen-tagline').value = currentData.general.tagline || '';
    document.getElementById('gen-typing-titles').value = (currentData.general.typingTitles || []).join('\n');

    // Profile & Photo
    updatePhotoPreview();
    document.getElementById('profile-fallback-emoji').value = currentData.profile.fallbackEmoji || '👨‍💻';
    document.getElementById('resume-url').value = currentData.profile.resumeUrl || '';
    if (currentData.profile.resumeName) {
        document.getElementById('resume-file-name').textContent = '📄 ' + (currentData.profile.resumeName || 'uploaded_resume.pdf');
    }

    // About
    document.getElementById('about-bio1').value = currentData.about.bio1 || '';
    document.getElementById('about-bio2').value = currentData.about.bio2 || '';

    // Contact & Socials
    document.getElementById('contact-email-admin').value = currentData.contact.email || '';
    document.getElementById('social-github').value = currentData.socials.github || '';
    document.getElementById('social-linkedin').value = currentData.socials.linkedin || '';
    document.getElementById('social-twitter').value = currentData.socials.twitter || '';
    document.getElementById('social-instagram').value = currentData.socials.instagram || '';

    // Footer
    document.getElementById('footer-text').value = currentData.footer.copyrightText || '';

    // Dynamic Lists
    loadSkills();
    loadProjects();
    loadEducation();
    loadExperience();
    loadCertifications();
}

// ── General Settings ─────────────────────────
async function saveGeneral() {
    currentData.general.name = document.getElementById('gen-name').value;
    currentData.general.pageTitle = document.getElementById('gen-page-title').value;
    currentData.general.tagline = document.getElementById('gen-tagline').value;
    currentData.general.typingTitles = document.getElementById('gen-typing-titles').value.split('\n').filter(t => t.trim());
    await persistData();
}

// ── Profile Photo & Cropper ──────────────────
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const modal = document.getElementById('cropper-modal');
        const img = document.getElementById('cropper-image');
        
        img.src = e.target.result;
        modal.style.display = 'block';

        if (cropper) cropper.destroy();
        
        img.onload = () => {
            cropper = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 2,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                responsive: true,
                checkOrientation: true
            });
        };
    };
    reader.readAsDataURL(file);
}

function closeCropper() {
    document.getElementById('cropper-modal').style.display = 'none';
    if (cropper) cropper.destroy();
    document.getElementById('photo-upload').value = '';
}


async function applyCrop() {
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    
    canvas.toBlob(async (blob) => {
        try {
            showToast('Uploading photo...');
            const publicUrl = await uploadFile(blob, 'portfolio-assets', 'profile_photo.webp');
            currentData.profile.photo = publicUrl;
            await persistData();
            updatePhotoPreview();
            closeCropper();
            showToast('Photo updated!');
        } catch (e) {
            alert('Upload failed: ' + e.message);
        }
    }, 'image/webp', 0.85);
}

function updatePhotoPreview() {
    const previewImg = document.getElementById('preview-img');
    const placeholder = document.getElementById('preview-placeholder');
    if (currentData.profile.photo) {
        previewImg.src = currentData.profile.photo;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.textContent = currentData.profile.fallbackEmoji || '👤';
    }
}

async function removePhoto() {
    currentData.profile.photo = '';
    updatePhotoPreview();
    await persistData();
    showToast('Photo removed.');
}

// ── Resume Management ────────────────────────
async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showToast('Uploading resume...');
        const publicUrl = await uploadFile(file, 'portfolio-assets', `resumes/${file.name}`);
        currentData.profile.resumeFile = publicUrl;
        currentData.profile.resumeName = file.name;
        document.getElementById('resume-file-name').textContent = '📄 ' + file.name;
        showToast('Resume uploaded!');
    } catch (e) {
        alert('Upload failed: ' + e.message);
    }
}

async function saveProfile() {
    currentData.profile.fallbackEmoji = document.getElementById('profile-fallback-emoji').value;
    currentData.profile.resumeUrl = document.getElementById('resume-url').value;
    await persistData();
    updatePhotoPreview();
}

async function clearResume() {
    if (confirm('Clear uploaded resume data?')) {
        currentData.profile.resumeFile = '';
        currentData.profile.resumeName = '';
        currentData.profile.resumeUrl = '';
        document.getElementById('resume-url').value = '';
        document.getElementById('resume-file-name').textContent = '';
        await persistData();
    }
}

// ── Certifications ────────────────────────
function loadCertifications() {
    const list = document.getElementById('certifications-list');
    if (!list) return;
    list.innerHTML = '';
    (currentData.certifications || []).forEach((cert, index) => {
        const item = document.createElement('div');
        item.className = 'form-card';
        item.innerHTML = `
            <div class="field-group">
                <label>Title</label>
                <input type="text" value="${escapeAdminHTML(cert.title)}" onchange="currentData.certifications[${index}].title=this.value">
            </div>
            <div class="field-group">
                <label>Issuer</label>
                <input type="text" value="${escapeAdminHTML(cert.issuer)}" onchange="currentData.certifications[${index}].issuer=this.value">
            </div>
            <div class="field-group">
                <label>Date / Year</label>
                <input type="text" value="${escapeAdminHTML(cert.date)}" onchange="currentData.certifications[${index}].date=this.value">
            </div>
            <div class="field-group">
                <label>Certificate Link</label>
                <input type="text" value="${escapeAdminHTML(cert.link)}" onchange="currentData.certifications[${index}].link=this.value">
            </div>
            <button class="btn-admin btn-danger-admin" onclick="deleteCertification(${index})">Delete</button>
        `;
        list.appendChild(item);
    });
}

function addCertification() {
    if (!currentData.certifications) currentData.certifications = [];
    currentData.certifications.push({ title: "New Certification", issuer: "", date: "", link: "#" });
    loadCertifications();
}

function deleteCertification(index) {
    currentData.certifications.splice(index, 1);
    loadCertifications();
}

async function saveCertifications() {
    await saveData(currentData);
    showToast('Certifications saved!');
}

// ── Skills ─────────────────────────────────
async function saveAbout() {
    currentData.about.bio1 = document.getElementById('about-bio1').value;
    currentData.about.bio2 = document.getElementById('about-bio2').value;
    await persistData();
}

// ── Dynamic List Managers ────────────────────

function loadEducation() {
    const list = document.getElementById('education-list');
    list.innerHTML = '';
    (currentData.education || []).forEach((edu, index) => {
        list.innerHTML += `
            <div class="form-card list-item" style="margin-bottom:15px;">
                <div class="field-group"><label>School/University</label><input type="text" value="${edu.school}" onchange="updateEdu(${index}, 'school', this.value)"></div>
                <div class="field-group"><label>Degree</label><input type="text" value="${edu.degree}" onchange="updateEdu(${index}, 'degree', this.value)"></div>
                <div class="field-group"><label>Duration</label><input type="text" value="${edu.duration}" onchange="updateEdu(${index}, 'duration', this.value)"></div>
                <div class="field-group"><label>Description</label><textarea onchange="updateEdu(${index}, 'description', this.value)">${edu.description}</textarea></div>
                <button class="btn-admin btn-danger-admin" onclick="removeEdu(${index})">✕ Remove</button>
            </div>
        `;
    });
}
function addEducation() { 
    if (!currentData.education) currentData.education = [];
    currentData.education.push({ school: 'New University', degree: 'Degree Name', duration: '2024 - 2028', description: '' }); 
    loadEducation(); 
}
function updateEdu(idx, key, val) { currentData.education[idx][key] = val; }
function removeEdu(idx) { currentData.education.splice(idx, 1); loadEducation(); }
async function saveEducation() { await persistData(); }

function loadExperience() {
    const list = document.getElementById('experience-list');
    list.innerHTML = '';
    (currentData.experience || []).forEach((exp, index) => {
        list.innerHTML += `
            <div class="form-card list-item" style="margin-bottom:15px;">
                <div class="field-group"><label>Company/Project</label><input type="text" value="${exp.company}" onchange="updateExp(${index}, 'company', this.value)"></div>
                <div class="field-group"><label>Role</label><input type="text" value="${exp.role}" onchange="updateExp(${index}, 'role', this.value)"></div>
                <div class="field-group"><label>Duration</label><input type="text" value="${exp.duration}" onchange="updateExp(${index}, 'duration', this.value)"></div>
                <div class="field-group"><label>Description</label><textarea onchange="updateExp(${index}, 'description', this.value)">${exp.description}</textarea></div>
                <button class="btn-admin btn-danger-admin" onclick="removeExp(${index})">✕ Remove</button>
            </div>
        `;
    });
}
function addExperience() { 
    if (!currentData.experience) currentData.experience = [];
    currentData.experience.push({ company: 'Company Name', role: 'Role Name', duration: '2024 - Present', description: '' }); 
    loadExperience(); 
}
function updateExp(idx, key, val) { currentData.experience[idx][key] = val; }
function removeExp(idx) { currentData.experience.splice(idx, 1); loadExperience(); }
async function saveExperience() { await persistData(); }

function loadSkills() {
    const list = document.getElementById('skills-list');
    list.innerHTML = '';
    currentData.about.skills.forEach((skill, index) => {
        list.innerHTML += `
            <div class="form-card list-item" style="margin-bottom:15px;">
                <div class="field-group"><label>Skill Title</label><input type="text" value="${skill.title}" onchange="updateSkill(${index}, 'title', this.value)"></div>
                <div class="field-group"><label>Description</label><input type="text" value="${skill.description}" onchange="updateSkill(${index}, 'description', this.value)"></div>
                <button class="btn-admin btn-danger-admin" onclick="removeSkill(${index})">✕ Remove</button>
            </div>
        `;
    });
}
function addSkill() { currentData.about.skills.push({ title: 'Skill Name', description: 'Tech detail' }); loadSkills(); }
function updateSkill(idx, key, val) { currentData.about.skills[idx][key] = val; }
function removeSkill(idx) { currentData.about.skills.splice(idx, 1); loadSkills(); }
async function saveSkills() { await persistData(); }

// ── Project Management (Supabase-Direct) ──

async function loadProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = '<p style="color:var(--text-muted);">Loading projects…</p>';
    try {
        const supabase = getSupabase();
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('is_featured', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) throw error;

        if (!projects || projects.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);">No projects yet. Click “Sync Now” to import from GitHub.</p>';
            return;
        }

        grid.innerHTML = projects.map(proj => {
            const isHidden = proj.display_order === -1;
            return `
            <div class="project-admin-card ${isHidden ? 'opacity: 0.5;' : ''}" id="proj-${proj.id}" style="${isHidden ? 'opacity:0.5;' : ''}">
                <div class="project-admin-header">
                    <h4>${escapeAdminHTML(proj.title)}</h4>
                    <div class="project-admin-actions">
                        <button class="btn-icon-admin ${proj.is_featured ? 'active' : ''}" onclick="togglePin('${proj.id}', ${proj.is_featured})" title="${proj.is_featured ? 'Unpin' : 'Pin'} project">📌</button>
                        <button class="btn-icon-admin ${isHidden ? 'active' : ''}" onclick="toggleHide('${proj.id}', ${isHidden})" title="${isHidden ? 'Show' : 'Hide'} project">${isHidden ? '🙈' : '👁️'}</button>
                        <button class="btn-icon-admin" onclick="deleteProject('${proj.id}')" title="Delete project" style="color:#f87171;">🗑️</button>
                    </div>
                </div>
                <p class="project-admin-desc">${escapeAdminHTML(proj.description || 'No description.')}</p>
                <div class="project-admin-footer">
                    <div class="project-tags">
                        ${(proj.tech_stack || []).map(t => `<span class="tag">${t}</span>`).join('')}
                        ${proj.is_featured ? '<span class="tag" style="background:rgba(99,102,241,0.15);color:#818cf8;">Featured</span>' : ''}
                    </div>
                    ${proj.github_url ? `<a href="${proj.github_url}" target="_blank" class="btn-icon-admin" title="View on GitHub">🔗</a>` : ''}
                </div>
            </div>
        `}).join('');
    } catch (e) {
        console.error('Error loading projects:', e);
        grid.innerHTML = `<p style="color:#f87171;">Error loading projects: ${e.message}. Make sure the database tables are created.</p>`;
    }
}

function escapeAdminHTML(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function togglePin(id, current) {
    const supabase = getSupabase();
    const { error } = await supabase.from('projects').update({ is_featured: !current }).eq('id', id);
    if (error) return showToast('Error: ' + error.message);
    loadProjects();
    showToast(current ? 'Project unpinned' : 'Project pinned 📌');
}

async function toggleHide(id, current) {
    const supabase = getSupabase();
    const { error } = await supabase.from('projects').update({ display_order: current ? 0 : -1 }).eq('id', id);
    if (error) return showToast('Error: ' + error.message);
    loadProjects();
    showToast(current ? 'Project visible again' : 'Project hidden');
}

async function deleteProject(id) {
    if (!confirm('Delete this project? It will be re-added on the next GitHub sync.')) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return showToast('Error: ' + error.message);
    loadProjects();
    showToast('Project deleted');
}

async function addProject() {
    const supabase = getSupabase();
    const { error } = await supabase.from('projects').insert({
        github_id:   Date.now(), // temp unique ID for manual projects
        title:       'New Project',
        description: 'Project description…',
        github_url:  '#',
        tech_stack:  [],
        is_featured: false,
        display_order: 0,
        manual_override: true
    });
    if (error) return showToast('Error: ' + error.message);
    loadProjects();
    showToast('Manual project added');
}

function filterProjects(type) {
    document.querySelectorAll('.project-filters .btn-admin').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    // Re-load with filter
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.project-admin-card');
    cards.forEach(card => {
        const isHidden = card.style.opacity === '0.5';
        const isPinned = card.querySelector('.btn-icon-admin.active[title*="Unpin"]');
        if (type === 'all')    card.style.display = '';
        if (type === 'hidden') card.style.display = isHidden ? '' : 'none';
        if (type === 'pinned') card.style.display = isPinned ? '' : 'none';
    });
}

// ── GitHub Sync (Client-Side) ──

async function triggerSync() {
    const btn   = document.getElementById('trigger-sync-btn');
    const wrap  = document.getElementById('sync-progress-wrap');
    const bar   = document.getElementById('sync-progress-bar');
    const label = document.getElementById('sync-progress-label');
    const errBox = document.getElementById('sync-error-box');

    // Load credentials from inputs
    const username = (document.getElementById('sync-username')?.value || '').trim();
    const token    = (document.getElementById('sync-token')?.value || '').trim();
    if (!username) { showToast('Enter your GitHub username first'); return; }
    setGitHubCredentials(username, token);

    // Reset UI
    btn.disabled = true;
    btn.textContent = '⏳ Syncing…';
    wrap.style.display = 'block';
    bar.style.width = '0%';
    errBox.style.display = 'none';

    try {
        const result = await runGitHubSync((message, pct) => {
            bar.style.width = pct + '%';
            label.textContent = message;
        });

        bar.style.width = '100%';
        label.textContent = `✅ Done! Synced ${result.synced} of ${result.total} repositories.`;

        if (result.errors.length > 0) {
            errBox.style.display = 'block';
            errBox.textContent = 'Partial errors: ' + result.errors.slice(0, 3).join(' | ');
        }

        showToast(`Sync complete! ${result.synced} repos synced.`);
        await updateSyncUI();
        loadProjects();

    } catch (e) {
        bar.style.width = '100%';
        bar.style.background = '#ef4444';
        label.textContent = '❌ Sync failed: ' + e.message;
        errBox.style.display = 'block';
        errBox.textContent = e.message;
        showToast('Sync failed: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Sync Now';
        // Hide progress bar after 5s
        setTimeout(() => { wrap.style.display = 'none'; bar.style.background = 'linear-gradient(90deg,#6366f1,#ec4899)'; }, 5000);
    }
}

async function updateSyncUI() {
    const badge    = document.getElementById('sync-status-badge');
    const timeEl   = document.getElementById('sync-last-time');
    const countEl  = document.getElementById('sync-repo-count');
    if (!badge) return;

    try {
        const status = await getSyncStatus();
        badge.textContent = status.status || 'never';
        badge.className   = 'badge ' + (status.status || '');
        timeEl.textContent  = status.last_sync ? new Date(status.last_sync).toLocaleString() : 'Never';

        // Count projects
        const supabase = getSupabase();
        const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true });
        if (countEl) countEl.textContent = count ?? '—';
    } catch (_) {
        badge.textContent = 'error';
        badge.className   = 'badge failed';
    }
}

function saveGitHubCredentials() {
    const username = document.getElementById('sync-username')?.value.trim();
    const token    = document.getElementById('sync-token')?.value.trim();
    if (username) {
        setGitHubCredentials(username, token);
        // Persist username in localStorage for convenience
        localStorage.setItem('gh_sync_username', username);
        showToast('GitHub credentials saved for this session 👍');
    }
}


// ── Contact & Socials ────────────────────────
async function saveContact() {
    currentData.contact.email = document.getElementById('contact-email-admin').value;
    await persistData();
}
async function saveSocials() {
    currentData.socials.github = document.getElementById('social-github').value;
    currentData.socials.linkedin = document.getElementById('social-linkedin').value;
    currentData.socials.twitter = document.getElementById('social-twitter').value;
    currentData.socials.instagram = document.getElementById('social-instagram').value;
    await persistData();
}

async function saveFooter() {
    currentData.footer.copyrightText = document.getElementById('footer-text').value;
    await persistData();
}

// ── Core Functionality ───────────────────────
async function persistData() {
    try {
        await saveData(currentData);
        showToast('Changes saved to Supabase!');
        return true;
    } catch (e) {
        alert('Error saving changes: ' + e.message);
        console.error('Save error:', e);
        return false;
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function exportData() {
    await exportPortfolioData();
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const data = await importData(file);
        currentData = data;
        loadDashboard();
        showToast('Data imported successfully!');
    } catch (err) {
        showToast('Import failed: ' + err.message);
    }
}

function resetToDefaults() {
    const modal = document.getElementById('reset-confirm-modal');
    if (modal) { modal.style.display = 'block'; return; }
    doReset();
}

async function doReset() {
    await hardReset();
}

async function changePassword() {
    const next = document.getElementById('new-password').value.trim();
    const confirm = document.getElementById('confirm-password').value.trim();
    const supabase = getSupabase();

    if (next !== confirm) return alert('New passwords do not match.');
    if (next.length < 6) return alert('Password too short (min 6 chars).');

    const { error } = await supabase.auth.updateUser({ password: next });

    if (error) {
        alert('Update failed: ' + error.message);
    } else {
        alert('Password changed! Relogging...');
        await supabase.auth.signOut();
        location.reload();
    }
}
