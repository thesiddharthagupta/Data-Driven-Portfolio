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

async function getAuthHeaders() {
    const { data: { session } } = await getSupabase().auth.getSession();
    return {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
    };
}

async function showDashboard() {
    currentData = await getData();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    loadDashboard();
    initInactivityTimer();
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

// ── Inactivity Timeout ───────────────────────
let inactivityTimer;
function initInactivityTimer() {
    const timeoutDuration = 15 * 60 * 1000; // 15 minutes

    function resetTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
            const supabase = getSupabase();
            await supabase.auth.signOut();
            alert("You have been logged out due to inactivity.");
            showLogin();
        }, timeoutDuration);
    }

    // Reset timer on user interaction
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.onclick = resetTimer;
    document.onscroll = resetTimer;

    resetTimer(); // Initialize first timer
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
            if (sectionId === 'sync') updateSyncUI();
            if (sectionId === 'messages') loadMessages();
            if (sectionId === 'activity') loadActivityLogs();

            // Close sidebar on mobile after selection
            if (window.innerWidth <= 992) {
                document.getElementById('sidebar').classList.remove('active');
            }
        });
    });

    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
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
    document.getElementById('about-location').value = currentData.about.location || '';
    document.getElementById('about-edu').value = currentData.about.education || '';
    document.getElementById('about-availability').value = currentData.about.availability || '';
    document.getElementById('about-email').value = currentData.about.email || '';

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

    // GitHub Sync Credentials (stored in browser)
    const usernameInput = document.getElementById('sync-username');
    const tokenInput = document.getElementById('sync-token');
    if (usernameInput) usernameInput.value = localStorage.getItem('gh_sync_username') || '';
    if (tokenInput) tokenInput.value = localStorage.getItem('gh_sync_token') || '';

    updateSyncUI();
}

// ── General Settings ─────────────────────────
async function saveGeneral() {
    currentData.general.name = document.getElementById('gen-name').value;
    currentData.general.pageTitle = document.getElementById('gen-page-title').value;
    currentData.general.tagline = document.getElementById('gen-tagline').value;
    currentData.general.typingTitles = document.getElementById('gen-typing-titles').value.split('\n').filter(t => t.trim());
    const prev = await persistData();
    await logActivity('Updated General Settings', {
        name: currentData.general.name,
        tagline: currentData.general.tagline
    }, prev);
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

        // Auto-save the new resume data
        await persistData();
        showToast('Resume uploaded and saved!');
    } catch (e) {
        alert('Upload failed: ' + e.message);
    }
}

async function saveProfile() {
    currentData.profile.fallbackEmoji = document.getElementById('profile-fallback-emoji').value;
    currentData.profile.resumeUrl = document.getElementById('resume-url').value;
    const prev = await persistData();
    updatePhotoPreview();
    await logActivity('Updated Profile Settings', {
        fallbackEmoji: currentData.profile.fallbackEmoji,
        resumeUrl: currentData.profile.resumeUrl
    }, prev);
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

// ── Achievements ────────────────────────
function loadCertifications() {
    const list = document.getElementById('certifications-list');
    if (!list) return;
    list.innerHTML = '';
    (currentData.certifications || []).forEach((cert, index) => {
        const item = document.createElement('div');
        item.className = 'form-card';
        item.innerHTML = `
            <div class="field-group">
                <label>Achievement Title</label>
                <input type="text" value="${escapeAdminHTML(cert.title)}" onchange="currentData.certifications[${index}].title=this.value">
            </div>
            <div class="field-group">
                <label>Issuer / Context</label>
                <input type="text" value="${escapeAdminHTML(cert.issuer)}" onchange="currentData.certifications[${index}].issuer=this.value">
            </div>
            <div class="field-group">
                <label>Date / Year</label>
                <input type="text" value="${escapeAdminHTML(cert.date)}" onchange="currentData.certifications[${index}].date=this.value">
            </div>
            <div class="field-group">
                <label>Verification Link (Optional)</label>
                <input type="text" value="${escapeAdminHTML(cert.link)}" onchange="currentData.certifications[${index}].link=this.value">
            </div>
            <button class="btn-admin btn-danger-admin" onclick="deleteCertification(${index})">Delete Achievement</button>
        `;
        list.appendChild(item);
    });
}

function addCertification() {
    if (!currentData.certifications) currentData.certifications = [];
    currentData.certifications.push({ title: "New Achievement", issuer: "", date: "", link: "#" });
    loadCertifications();
}

function deleteCertification(index) {
    currentData.certifications.splice(index, 1);
    loadCertifications();
}

async function saveCertifications() {
    const prev = await persistData();
    await logActivity('Updated Achievements', { count: currentData.certifications.length }, prev);
}

// ── Skills ─────────────────────────────────
async function saveAbout() {
    currentData.about.bio1 = document.getElementById('about-bio1').value;
    currentData.about.bio2 = document.getElementById('about-bio2').value;
    currentData.about.location = document.getElementById('about-location').value;
    currentData.about.education = document.getElementById('about-edu').value;
    currentData.about.availability = document.getElementById('about-availability').value;
    currentData.about.email = document.getElementById('about-email').value;

    const prev = await persistData();
    await logActivity('Updated About Info', { bio1: currentData.about.bio1.substring(0, 30) + '...' }, prev);
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
async function saveEducation() {
    const prev = await persistData();
    const summary = currentData.education.map(e => e.school || e.degree).filter(Boolean).join(', ');
    await logActivity('Updated Education', { list: summary }, prev);
}

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
async function saveExperience() {
    const prev = await persistData();
    const summary = currentData.experience.map(e => e.title || e.company).filter(Boolean).join(', ');
    await logActivity('Updated Experience', { list: summary }, prev);
}

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
async function saveSkills() {
    const prev = await persistData();
    const summary = currentData.about.skills.map(s => s.title).filter(Boolean).join(', ');
    await logActivity('Updated Skills', { list: summary }, prev);
}

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
            const projJson = JSON.stringify(proj).replace(/'/g, "&#39;");
            
            const thumbDisplay = proj.thumbnail 
                ? `<div class="project-admin-thumb-wrap">
                     <img src="${proj.thumbnail}" class="project-admin-thumb">
                     <button class="thumb-edit-overlay" onclick='openProjectEditModal(${projJson})'>Change Image</button>
                   </div>`
                : `<div class="project-admin-thumb-empty" onclick='openProjectEditModal(${projJson})'>
                     <span>📸 Add Thumbnail</span>
                   </div>`;

            return `
            <div class="project-admin-card" id="proj-${proj.id}" style="${isHidden ? 'opacity:0.6;' : ''}">
                <div class="project-admin-header">
                    <h4>${escapeAdminHTML(proj.title)}</h4>
                    <div class="project-admin-actions">
                        <button class="btn-icon-admin" onclick='openProjectEditModal(${projJson})' title="Edit project details">📝</button>
                        <button class="btn-icon-admin ${proj.is_featured ? 'active' : ''}" onclick="togglePin('${proj.id}', ${proj.is_featured})" title="${proj.is_featured ? 'Unpin' : 'Pin'} project">📌</button>
                        <button class="btn-icon-admin ${isHidden ? 'active' : ''}" onclick="toggleHide('${proj.id}', ${isHidden})" title="${isHidden ? 'Show' : 'Hide'} project">${isHidden ? '🙈' : '👁️'}</button>
                        <button class="btn-icon-admin" onclick="deleteProject('${proj.id}')" title="Delete project" style="color:#f87171;">🗑️</button>
                    </div>
                </div>
                ${thumbDisplay}
                <p class="project-admin-desc">${escapeAdminHTML(proj.description || 'No description.')}</p>
                <div class="project-admin-footer">
                    <div class="project-tags">
                        ${(proj.tech_stack || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
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
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function togglePin(id, current) {
    const supabase = getSupabase();
    const { error } = await supabase.from('projects').update({
        is_featured: !current,
        updated_at: new Date()
    }).eq('id', id);
    if (error) return showToast('Error: ' + error.message);
    loadProjects();
    showToast(current ? 'Project unpinned' : 'Project pinned 📌');
}

async function toggleHide(id, current) {
    const supabase = getSupabase();
    const { error } = await supabase.from('projects').update({
        display_order: current ? 0 : -1,
        updated_at: new Date()
    }).eq('id', id);
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
        github_id: Date.now(), // temp unique ID for manual projects
        title: 'New Project',
        description: 'Project description…',
        github_url: '#',
        tech_stack: [],
        is_featured: false,
        display_order: 0,
        manual_override: true,
        updated_at: new Date()
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
        if (type === 'all') card.style.display = '';
        if (type === 'hidden') card.style.display = isHidden ? '' : 'none';
        if (type === 'pinned') card.style.display = isPinned ? '' : 'none';
    });
}

// ── Project Modal Logic ──────────────────

function openProjectEditModal(proj) {
    const modal = document.getElementById('project-edit-modal');
    document.getElementById('edit-project-id').value = proj.id;
    document.getElementById('edit-project-title').value = proj.title || '';
    document.getElementById('edit-project-desc').value = proj.description || '';
    document.getElementById('edit-project-link').value = proj.link || proj.homepage_url || '';
    document.getElementById('edit-project-thumb-url').value = proj.thumbnail || '';

    updateThumbPreview(proj.thumbnail);
    modal.style.display = 'block';
}

function closeProjectModal() {
    document.getElementById('project-edit-modal').style.display = 'none';
}

function updateThumbPreview(url) {
    const preview = document.getElementById('edit-project-thumb-preview');
    if (url) {
        preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        preview.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">No Image</span>`;
    }
}

async function handleThumbnailUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showToast('Uploading thumbnail...');
        const publicUrl = await uploadFile(file, 'portfolio-assets', `projects/${Date.now()}-${file.name}`);
        document.getElementById('edit-project-thumb-url').value = publicUrl;
        updateThumbPreview(publicUrl);
        showToast('Thumbnail uploaded!');
    } catch (e) {
        showToast('Upload failed: ' + e.message, 'error');
    }
}

async function saveProjectEdit() {
    const id = document.getElementById('edit-project-id').value;
    const payload = {
        title: document.getElementById('edit-project-title').value,
        description: document.getElementById('edit-project-desc').value,
        link: document.getElementById('edit-project-link').value,
        homepage_url: document.getElementById('edit-project-link').value, // Dual support
        thumbnail: document.getElementById('edit-project-thumb-url').value,
        manual_override: true, 
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('projects')
            .update(payload)
            .eq('id', id);

        if (error) throw error;

        showToast('Project updated successfully!');
        closeProjectModal();
        loadProjects();
        await logActivity('Edited Project Details', { title: payload.title, id: id });
    } catch (e) {
        console.error('Save error:', e);
        alert('SAVE FAILED: ' + e.message + '\n\nIf the error mentions a missing column, please run the SQL in migration.sql in your Supabase dashboard.');
        showToast('Save failed: ' + e.message, 'error');
    }
}

// ── GitHub Sync (Client-Side) ──

async function triggerSync() {
    const btn = document.getElementById('trigger-sync-btn');
    const wrap = document.getElementById('sync-progress-wrap');
    const bar = document.getElementById('sync-progress-bar');
    const label = document.getElementById('sync-progress-label');
    const errBox = document.getElementById('sync-error-box');

    // 1. Try Server-Side Sync first (More reliable, avoids IP rate limits)
    btn.disabled = true;
    btn.textContent = '⏳ Requesting Server Sync…';
    wrap.style.display = 'block';
    bar.style.width = '20%';
    label.textContent = 'Contacting server...';
    errBox.style.display = 'none';

    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/sync-now', {
            method: 'POST',
            headers: headers
        });
        if (response.ok) {
            bar.style.width = '100%';
            label.textContent = '✅ Server sync started in background! Status will update in a few seconds.';
            showToast('Server sync triggered!', 'success');

            // Wait and refresh
            setTimeout(async () => {
                await updateSyncUI();
                loadProjects();
                btn.disabled = false;
                btn.textContent = '🚀 Sync Now';
                setTimeout(() => { wrap.style.display = 'none'; }, 2000);
            }, 3000);
            return;
        }
    } catch (e) {
        console.warn('Server sync unavailable, falling back to browser sync.');
    }

    // 2. Fallback to Client-Side Sync
    const username = (document.getElementById('sync-username')?.value || '').trim();
    const token = (document.getElementById('sync-token')?.value || '').trim();
    if (!username) {
        showToast('Enter your GitHub username first', 'error');
        btn.disabled = false;
        btn.textContent = '🚀 Sync Now';
        wrap.style.display = 'none';
        return;
    }

    setGitHubCredentials(username, token);
    btn.textContent = '⏳ Browser Syncing…';
    bar.style.width = '30%';

    try {
        const result = await runGitHubSync((message, pct) => {
            bar.style.width = pct + '%';
            label.textContent = message;
        });

        bar.style.width = '100%';
        label.textContent = `✅ Done! Synced ${result.synced} repositories.`;

        if (result.errors.length > 0) {
            errBox.style.display = 'block';
            errBox.textContent = 'Partial errors: ' + result.errors.slice(0, 3).join(' | ');
        }

        showToast(`Sync complete! ${result.synced} repos synced.`, 'success');
        await logActivity('GitHub Sync Performed (Browser)', { synced: result.synced, total: result.total });
        await updateSyncUI();
        loadProjects();

    } catch (e) {
        bar.style.width = '100%';
        bar.style.background = '#ef4444';
        label.textContent = '❌ Sync failed: ' + e.message;
        errBox.style.display = 'block';
        errBox.textContent = e.message;
        showToast('Sync failed: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Sync Now';
        setTimeout(() => { wrap.style.display = 'none'; bar.style.background = 'linear-gradient(90deg,#6366f1,#ec4899)'; }, 5000);
    }
}

async function updateSyncUI() {
    const badge = document.getElementById('sync-status-badge');
    const timeEl = document.getElementById('sync-last-time');
    const countEl = document.getElementById('sync-repo-count');
    if (!badge) return;

    try {
        const status = await getSyncStatus();
        badge.textContent = status.status || 'never';
        badge.className = 'badge ' + (status.status || '');
        timeEl.textContent = status.last_sync ? new Date(status.last_sync).toLocaleString() : 'Never';

        // Count projects
        const supabase = getSupabase();
        const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true });
        if (countEl) countEl.textContent = count ?? '—';
    } catch (_) {
        badge.textContent = 'error';
        badge.className = 'badge failed';
    }
}

function saveGitHubCredentials() {
    const username = document.getElementById('sync-username')?.value.trim();
    const token = document.getElementById('sync-token')?.value.trim();
    if (username) {
        setGitHubCredentials(username, token);
        localStorage.setItem('gh_sync_username', username);
        if (token) localStorage.setItem('gh_sync_token', token);
        showToast('GitHub credentials saved! These will persist in your browser.', 'success');
    }
}


// ── Contact & Socials ────────────────────────
async function saveContact() {
    currentData.contact.email = document.getElementById('contact-email-admin').value;
    await persistData();
}

// ── Messages Management (Supabase) ──────────

async function loadMessages() {
    const grid = document.getElementById('messages-grid');
    if (!grid) return;

    grid.innerHTML = '<p style="color:var(--text-muted);">Loading messages…</p>';
    try {
        const supabase = getSupabase();
        const { data: messages, error } = await supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        if (!messages || messages.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);">No messages found.</p>';
            return;
        }

        grid.innerHTML = messages.map(msg => {
            const time = new Date(msg.created_at).toLocaleString();
            return `
            <div class="project-admin-card" id="msg-${msg.id}">
                <div class="project-admin-header">
                    <h4 style="margin:0;">${escapeAdminHTML(msg.name)}</h4>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${time}</div>
                </div>
                <div style="font-size: 0.9rem; color: #818cf8; margin-bottom: 8px;">
                    <a href="mailto:${escapeAdminHTML(msg.email)}" style="color: inherit; text-decoration: none;">✉️ ${escapeAdminHTML(msg.email)}</a>
                </div>
                <p class="project-admin-desc" style="white-space: pre-wrap; margin-bottom: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">${escapeAdminHTML(msg.message)}</p>
                <div class="project-admin-footer">
                    <button class="btn-admin btn-danger-admin" style="padding: 4px 10px; font-size: 0.8rem; width: auto;" onclick="deleteMessage('${msg.id}')">🗑️ Delete</button>
                </div>
            </div>
        `}).join('');
    } catch (e) {
        console.error('Error loading messages:', e);
        grid.innerHTML = `<p style="color:#f87171;">Error loading messages: ${e.message}</p>`;
    }
}

async function deleteMessage(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
        const supabase = getSupabase();
        const { error } = await supabase.from('contact_messages').delete().eq('id', id);
        if (error) throw error;
        showToast('Message deleted');
        loadMessages();
    } catch (e) {
        showToast('Error deleting message: ' + e.message, 'error');
    }
}
async function saveSocials() {
    currentData.socials.github = document.getElementById('social-github').value;
    currentData.socials.linkedin = document.getElementById('social-linkedin').value;
    currentData.socials.twitter = document.getElementById('social-twitter').value;
    currentData.socials.instagram = document.getElementById('social-instagram').value;
    const prev = await persistData();
    await logActivity('Updated Social Links', currentData.socials, prev);
}

async function saveFooter() {
    currentData.footer.copyrightText = document.getElementById('footer-text').value;
    const prev = await persistData();
    await logActivity('Updated Footer Text', { copyright: currentData.footer.copyrightText }, prev);
}

// ── Core Functionality ───────────────────────
async function persistData() {
    try {
        // Fetch current data from DB before overwriting to save as snapshot
        const previousData = await getData();

        await saveData(currentData);
        showToast('Changes saved to Supabase!', 'success');
        return previousData; // Return previous state for logging
    } catch (e) {
        alert('Error saving changes: ' + e.message);
        console.error('Save error:', e);
        return false;
    }
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show'; // Reset and show
    if (type === 'error') toast.classList.add('toast-error');
    else toast.classList.add('toast-success');

    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Activity Logging & Undo ──

async function logActivity(action, details, snapshot = null) {
    try {
        const supabase = getSupabase();
        const payload = {
            action,
            details: details || {}
        };
        if (snapshot) payload.details.snapshot = snapshot;

        const { error } = await supabase.from('admin_logs').insert(payload);
        if (error) throw error;
    } catch (e) {
        console.error('Error logging activity:', e);
    }
}

async function loadActivityLogs() {
    const list = document.getElementById('activity-log-list');
    if (!list) return;

    list.innerHTML = '<p style="color:var(--text-muted);">Loading logs…</p>';
    try {
        const supabase = getSupabase();
        const { data: logs, error } = await supabase
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        if (!logs || logs.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted);">No activity recorded yet.</p>';
            return;
        }

        list.innerHTML = logs.map(log => {
            const time = new Date(log.created_at).toLocaleString();
            const hasSnapshot = log.details && log.details.snapshot;

            // Clean details for display (remove snapshot)
            const displayDetails = { ...log.details };
            delete displayDetails.snapshot;

            return `
            <div class="activity-log-item" style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 3px solid var(--accent);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div>
                        <strong style="color: var(--text-bright);">${escapeAdminHTML(log.action)}</strong>
                        <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 10px;">${time}</span>
                    </div>
                    ${hasSnapshot ? `<button class="btn-admin btn-secondary-admin" style="padding: 4px 10px; font-size: 0.75rem; width: auto;" onclick="revertToSnapshot('${log.id}')">↩ Undo/Revert</button>` : ''}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); font-family: monospace; white-space: pre-wrap; overflow-x: auto; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
                    ${JSON.stringify(displayDetails, null, 2)}
                </div>
            </div>
        `}).join('');
    } catch (e) {
        console.error('Error loading logs:', e);
        list.innerHTML = `<p style="color:#f87171;">Error loading logs: ${e.message}</p>`;
    }
}

async function revertToSnapshot(logId) {
    if (!confirm('Revert all settings to this previous state? This will overwrite your current changes.')) return;

    try {
        const supabase = getSupabase();
        const { data: log, error } = await supabase
            .from('admin_logs')
            .select('details')
            .eq('id', logId)
            .single();

        if (error) throw error;
        if (!log.details.snapshot) throw new Error('No snapshot found for this log entry.');

        showToast('Reverting data...', 'info');
        const snapshot = log.details.snapshot;

        await saveData(snapshot);

        // Log the revert itself
        await logActivity('Reverted to previous state', { reverted_from_log_id: logId });

        showToast('Successfully reverted! Reloading dashboard...', 'success');
        setTimeout(() => location.reload(), 1500);

    } catch (e) {
        alert('Revert failed: ' + e.message);
    }
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
