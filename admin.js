// ============================================
// admin.js — Portfolio Admin Panel Logic
// ============================================

let currentData = null;
let cropper = null;

// ── Initialization ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    currentData = getData();
    initLogin();
    initNavigation();
    loadDashboard();
});

// ── Authentication ───────────────────────────
function initLogin() {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('admin-password');
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('admin-dashboard');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = passwordInput.value.trim();
        const savedPwd = localStorage.getItem('admin_password') || 'admin123';

        if (pwd === savedPwd) {
            loginScreen.style.display = 'none';
            dashboard.style.display = 'flex';
            showToast('Login successful!');
        } else {
            const err = document.getElementById('login-error');
            err.textContent = 'Invalid password. Try "admin123" if not changed.';
            err.style.display = 'block';
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        location.reload();
    });
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
            document.getElementById(`section-${sectionId}`).classList.add('active');
        });
    });
}

// ── Load Dashboard Data ──────────────────────
function loadDashboard() {
    // General
    document.getElementById('gen-name').value = currentData.general.name || '';
    document.getElementById('gen-page-title').value = currentData.general.pageTitle || '';
    document.getElementById('gen-tagline').value = currentData.general.tagline || '';
    document.getElementById('gen-typing-titles').value = (currentData.general.typingTitles || []).join('\n');

    // Profile & Photo
    updatePhotoPreview();
    document.getElementById('profile-fallback-emoji').value = currentData.profile.fallbackEmoji || '👨‍💻';
    document.getElementById('resume-url').value = currentData.profile.resumeUrl || '';
    if (currentData.profile.resumeFile) {
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
}

// ── General Settings ─────────────────────────
function saveGeneral() {
    currentData.general.name = document.getElementById('gen-name').value;
    currentData.general.pageTitle = document.getElementById('gen-page-title').value;
    currentData.general.tagline = document.getElementById('gen-tagline').value;
    currentData.general.typingTitles = document.getElementById('gen-typing-titles').value.split('\n').filter(t => t.trim());
    persistData();
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
        
        // Wait for image to load before initializing cropper
        img.onload = () => {
            cropper = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 2, // Restrict crop box within image
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

function applyCrop() {
    const canvas = cropper.getCroppedCanvas({ 
        width: 400, 
        height: 400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    const croppedBase64 = canvas.toDataURL('image/webp', 0.85);
    
    const oldPhoto = currentData.profile.photo;
    currentData.profile.photo = croppedBase64;
    
    if (persistData()) {
        updatePhotoPreview();
        closeCropper();
        showToast('Photo cropped and updated!');
    } else {
        // Revert on failure
        currentData.profile.photo = oldPhoto;
    }
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

function removePhoto() {
    currentData.profile.photo = '';
    updatePhotoPreview();
    persistData();
    showToast('Photo removed.');
}

// ── Resume Management ────────────────────────
function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('File too large (>2MB). Please compress your PDF to prevent storage errors.');

    const reader = new FileReader();
    reader.onload = (e) => {
        currentData.profile.resumeFile = e.target.result;
        currentData.profile.resumeName = file.name;
        document.getElementById('resume-file-name').textContent = '📄 ' + file.name;
    };
    reader.readAsDataURL(file);
}

function saveProfile() {
    currentData.profile.fallbackEmoji = document.getElementById('profile-fallback-emoji').value;
    currentData.profile.resumeUrl = document.getElementById('resume-url').value;
    persistData();
    updatePhotoPreview();
}

function clearResume() {
    if (confirm('Clear uploaded resume data?')) {
        currentData.profile.resumeFile = '';
        currentData.profile.resumeName = '';
        currentData.profile.resumeUrl = '';
        document.getElementById('resume-url').value = '';
        document.getElementById('resume-file-name').textContent = '';
        saveData();
    }
}

// ── About Me ─────────────────────────────────
function saveAbout() {
    currentData.about.bio1 = document.getElementById('about-bio1').value;
    currentData.about.bio2 = document.getElementById('about-bio2').value;
    persistData();
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
function saveEducation() { persistData(); }

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
function saveExperience() { persistData(); }

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
function saveSkills() { persistData(); }

function loadProjects() {
    const list = document.getElementById('projects-list');
    list.innerHTML = '';
    currentData.projects.forEach((proj, index) => {
        list.innerHTML += `
            <div class="form-card list-item" style="margin-bottom:15px;">
                <div class="field-group"><label>Project Title</label><input type="text" value="${proj.title}" onchange="updateProj(${index}, 'title', this.value)"></div>
                <div class="field-group"><label>Description</label><textarea onchange="updateProj(${index}, 'description', this.value)">${proj.description}</textarea></div>
                <div class="field-group"><label>Link</label><input type="url" value="${proj.link}" onchange="updateProj(${index}, 'link', this.value)"></div>
                <button class="btn-admin btn-danger-admin" onclick="removeProj(${index})">✕ Remove Project</button>
            </div>
        `;
    });
}
function addProject() { currentData.projects.push({ title: 'New Project', description: '', link: '#', gradient: 'gradient-1' }); loadProjects(); }
function updateProj(idx, key, val) { currentData.projects[idx][key] = val; }
function removeProj(idx) { currentData.projects.splice(idx, 1); loadProjects(); }
function saveProjects() { persistData(); }

// ── Contact & Socials ────────────────────────
function saveContact() {
    currentData.contact.email = document.getElementById('contact-email-admin').value;
    persistData();
}
function saveSocials() {
    currentData.socials.github = document.getElementById('social-github').value;
    currentData.socials.linkedin = document.getElementById('social-linkedin').value;
    currentData.socials.twitter = document.getElementById('social-twitter').value;
    currentData.socials.instagram = document.getElementById('social-instagram').value;
    persistData();
}
function saveFooter() {
    currentData.footer.copyrightText = document.getElementById('footer-text').value;
    persistData();
}

// ── Core Functionality ───────────────────────
function persistData() {
    try {
        currentData._version = 3;
        localStorage.setItem('portfolio_data', JSON.stringify(currentData));
        showToast('Changes saved successfully!');
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('quota'))) {
            alert('Storage limit reached! Your photo or resume is too large to save. Please compress them and try again.');
        } else {
            alert('Error saving changes. See console.');
        }
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

function exportData() {
    exportPortfolioData();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    importData(file).then(data => {
        currentData = data;
        loadDashboard();
        showToast('Data imported successfully!');
    }).catch(err => showToast('Import failed: ' + err.message));
}

function resetToDefaults() {
    // Use inline modal instead of confirm() which is blocked on file:// protocol
    const modal = document.getElementById('reset-confirm-modal');
    if (modal) { modal.style.display = 'block'; return; }
    // Fallback: direct reset
    doReset();
}

function doReset() {
    hardReset();
    location.reload();
}

function changePassword() {
    const current = document.getElementById('current-password').value.trim();
    const next = document.getElementById('new-password').value.trim();
    const confirm = document.getElementById('confirm-password').value.trim();
    const saved = localStorage.getItem('admin_password') || 'admin123';

    if (current !== saved) return alert('Current password incorrect.');
    if (next !== confirm) return alert('New passwords do not match.');
    if (next.length < 4) return alert('Password too short.');

    localStorage.setItem('admin_password', next);
    alert('Password changed! Relogging...');
    location.reload();
}
