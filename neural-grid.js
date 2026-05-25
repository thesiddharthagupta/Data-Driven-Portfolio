// ============================================
// neural-grid.js — Full-Page Multi-Layer Background
// Neural Grid + 3D Earth Globe + Geometrics + Orbs
// ============================================

class NeuralGrid {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.showGlobe = options.showGlobe !== false;
        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;
        this.scrollY = 0;
        this.time = 0;

        // Mouse
        this.mouse = { x: null, y: null, active: false };

        // Globe rotation state
        this.rotationY = 0;
        this.rotationX = -0.35;
        this.autoRotateSpeed = 0.0042;
        this.mouseInfluenceX = 0;
        this.mouseInfluenceY = 0;
        this.globeRadius = 0;
        this.globeCX = 0;
        this.globeCY = 0;
        this.fov = 320;

        // Effect arrays
        this.particles = [];
        this.globeNodes = [];
        this.globeConns = [];
        this.geometrics = [];
        this.orbs = [];

        // Brand colors
        this.colors = {
            indigo:  { r: 99,  g: 102, b: 241 },
            pink:    { r: 236, g: 72,  b: 153 },
            emerald: { r: 16,  g: 185, b: 129 },
            cyan:    { r: 34,  g: 211, b: 238 },
        };

        // Continent zones: [lat°, lon°, angularRadius°]
        this.continents = [
            { lat: 45, lon: -100, radius: 28 }, { lat: 55, lon: -115, radius: 15 },
            { lat: 30, lon: -90, radius: 12 }, { lat: 15, lon: -88, radius: 8 },
            { lat: -15, lon: -58, radius: 25 }, { lat: -35, lon: -65, radius: 12 },
            { lat: 50, lon: 15, radius: 18 }, { lat: 60, lon: 25, radius: 12 },
            { lat: 42, lon: 2, radius: 8 }, { lat: 8, lon: 22, radius: 28 },
            { lat: -10, lon: 28, radius: 18 }, { lat: 30, lon: 10, radius: 12 },
            { lat: 30, lon: 45, radius: 12 }, { lat: 40, lon: 90, radius: 28 },
            { lat: 55, lon: 80, radius: 18 }, { lat: 25, lon: 80, radius: 14 },
            { lat: 35, lon: 105, radius: 16 }, { lat: 38, lon: 140, radius: 8 },
            { lat: 5, lon: 110, radius: 14 }, { lat: -25, lon: 135, radius: 20 },
            { lat: 72, lon: -42, radius: 10 },
        ];
        this.continentSpheres = this.continents.map(c => {
            const la = c.lat * Math.PI / 180, lo = c.lon * Math.PI / 180;
            return { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: Math.cos(la) * Math.sin(lo), cosR: Math.cos(c.radius * Math.PI / 180) };
        });

        // Config (will be adjusted by screen size)
        this.cfg = {
            particles: 70, globeNodes: 260, geometrics: 14, orbs: 4,
            particleMaxDist: 140, particleSpeed: [0.12, 0.42],
            mouseRepulse: 130, globeConnDist: 0.38,
        };

        this.init();
    }

    // ── Initialization ─────────────────────────
    init() {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            this.cfg.particles = 20; this.cfg.globeNodes = 80;
            this.cfg.geometrics = 4; this.autoRotateSpeed = 0.0004;
        }
        this.adjustForScreen();
        this.resize();
        this.createParticles();
        if (this.showGlobe && this.width >= 768) this.createGlobe();
        this.createGeometrics();
        this.createOrbs();
        this.bindEvents();
        this.animate();
    }

    adjustForScreen() {
        const w = window.innerWidth;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (w < 768) {
            this.cfg.particles = reduced ? 12 : 30;
            this.cfg.geometrics = reduced ? 3 : 7;
            this.cfg.orbs = 3;
            this.cfg.particleMaxDist = 100;
        } else {
            this.cfg.particles = reduced ? 20 : 70;
            this.cfg.globeNodes = reduced ? 80 : 260;
            this.cfg.geometrics = reduced ? 4 : 14;
            this.cfg.orbs = 4;
            this.cfg.particleMaxDist = 140;
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Align the live neural globe with the generated Earth artwork on the right.
        const minDim = Math.min(this.width, this.height);
        this.globeRadius = minDim * 0.30;
        this.globeCX = this.width * 0.78;
        this.globeCY = this.height * 0.48;
    }

    // ── PARTICLES (full-page neural network) ───
    createParticles() {
        this.particles = [];
        const colorPool = [this.colors.indigo, this.colors.pink, this.colors.emerald, this.colors.cyan];
        for (let i = 0; i < this.cfg.particles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = this.cfg.particleSpeed[0] + Math.random() * (this.cfg.particleSpeed[1] - this.cfg.particleSpeed[0]);
            const c = colorPool[Math.floor(Math.random() * colorPool.length)];
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 1.0 + Math.random() * 2.0,
                color: c,
                alpha: 0.25 + Math.random() * 0.35,
            });
        }
    }

    updateParticles() {
        for (const p of this.particles) {
            if (this.mouse.active && this.mouse.x !== null) {
                const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < this.cfg.mouseRepulse && dist > 0) {
                    const force = (this.cfg.mouseRepulse - dist) / this.cfg.mouseRepulse;
                    p.vx += (dx / dist) * force * 0.6;
                    p.vy += (dy / dist) * force * 0.6;
                }
            }
            // Dampen back to natural speed
            const spd = Math.hypot(p.vx, p.vy);
            const maxSpd = this.cfg.particleSpeed[1] * 2.5;
            if (spd > maxSpd) { p.vx *= 0.96; p.vy *= 0.96; }

            p.x += p.vx; p.y += p.vy;
            // Wrap edges
            if (p.x < -20) p.x = this.width + 20;
            else if (p.x > this.width + 20) p.x = -20;
            if (p.y < -20) p.y = this.height + 20;
            else if (p.y > this.height + 20) p.y = -20;
        }
    }

    drawParticles() {
        const ctx = this.ctx;
        const maxD = this.cfg.particleMaxDist;
        // Connections
        for (let i = 0; i < this.particles.length; i++) {
            const a = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const b = this.particles[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < maxD) {
                    const alpha = (1 - dist / maxD) * 0.10;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        // Mouse connections
        if (this.mouse.active && this.mouse.x !== null) {
            for (const p of this.particles) {
                const dist = Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y);
                if (dist < this.cfg.mouseRepulse) {
                    const alpha = (1 - dist / this.cfg.mouseRepulse) * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(this.mouse.x, this.mouse.y);
                    ctx.strokeStyle = `rgba(236,72,153,${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
        // Nodes
        for (const p of this.particles) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = `rgba(${p.color.r},${p.color.g},${p.color.b},0.4)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // ── 3D EARTH GLOBE ─────────────────────────
    isLand(x, y, z) {
        for (const c of this.continentSpheres) {
            if (x * c.x + y * c.y + z * c.z >= c.cosR) return true;
        }
        return false;
    }

    createGlobe() {
        this.globeNodes = [];
        const n = this.cfg.globeNodes;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i++) {
            const y = 1 - (i / (n - 1)) * 2;
            const rAtY = Math.sqrt(1 - y * y);
            const theta = golden * i;
            const x = Math.cos(theta) * rAtY;
            const z = Math.sin(theta) * rAtY;
            const land = this.isLand(x, y, z);
            this.globeNodes.push({
                ox: x, oy: y, oz: z,
                sx: 0, sy: 0, scale: 0, depth: 0,
                isLand: land,
                r: land ? (1.6 + Math.random() * 1.6) : (1.0 + Math.random() * 1.2),
            });
        }
        // Pre-compute connections
        this.globeConns = [];
        const thr = this.cfg.globeConnDist;
        const thrSq = thr * thr;
        for (let i = 0; i < n; i++) {
            const a = this.globeNodes[i];
            for (let j = i + 1; j < n; j++) {
                const b = this.globeNodes[j];
                const dSq = (a.ox - b.ox) ** 2 + (a.oy - b.oy) ** 2 + (a.oz - b.oz) ** 2;
                if (dSq < thrSq) this.globeConns.push({ i, j });
            }
        }
    }

    rotatePoint(x, y, z) {
        const cy = Math.cos(this.rotationY), sy = Math.sin(this.rotationY);
        let rx = x * cy + z * sy, rz = -x * sy + z * cy, ry = y;
        const tiltX = this.rotationX + this.mouseInfluenceX;
        const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
        return { x: rx, y: ry * cx - rz * sx, z: ry * sx + rz * cx };
    }

    drawGlobe() {
        if (!this.globeNodes.length) return;
        // Fade globe based on scroll: fully visible at top, fades by 1x viewport height
        const scrollFade = Math.max(0, 1 - this.scrollY / (this.height * 0.6));
        if (scrollFade < 0.01) return;

        const ctx = this.ctx;
        this.rotationY += this.autoRotateSpeed + this.mouseInfluenceY;

        // Atmosphere glow
        const pulse = 0.04 + Math.sin(this.time * 0.0008) * 0.02;
        const atmo = ctx.createRadialGradient(this.globeCX, this.globeCY, this.globeRadius * 0.6, this.globeCX, this.globeCY, this.globeRadius * 1.35);
        atmo.addColorStop(0, `rgba(99,102,241,${pulse * scrollFade})`);
        atmo.addColorStop(0.5, `rgba(16,185,129,${pulse * 0.5 * scrollFade})`);
        atmo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(this.globeCX, this.globeCY, this.globeRadius * 1.35, 0, Math.PI * 2);
        ctx.fillStyle = atmo;
        ctx.fill();

        // Update node positions
        for (const nd of this.globeNodes) {
            const r = this.rotatePoint(nd.ox, nd.oy, nd.oz);
            const scale = this.fov / (this.fov + r.z * this.globeRadius);
            nd.sx = this.globeCX + r.x * this.globeRadius * scale;
            nd.sy = this.globeCY - r.y * this.globeRadius * scale;
            nd.scale = scale;
            nd.depth = r.z;
        }

        // Draw connections
        for (const c of this.globeConns) {
            const a = this.globeNodes[c.i], b = this.globeNodes[c.j];
            if (a.depth < -0.3 && b.depth < -0.3) continue;
            const avg = (a.depth + b.depth) / 2;
            const alpha = Math.max(0, (avg + 1) / 2) * 0.13 * scrollFade;
            if (alpha < 0.005) continue;
            const land = a.isLand && b.isLand;
            const col = land ? this.colors.emerald : this.colors.indigo;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
            ctx.lineWidth = 0.6 * ((a.scale + b.scale) / 2);
            ctx.stroke();
        }

        // Draw nodes (sorted by depth, back to front)
        const sorted = [...this.globeNodes].sort((a, b) => a.depth - b.depth);
        for (const nd of sorted) {
            if (nd.depth < -0.5) continue;
            const depthA = Math.max(0, (nd.depth + 1) / 2);
            const alpha = (0.12 + depthA * 0.7) * scrollFade;
            const radius = nd.r * nd.scale;
            const col = nd.isLand ? this.colors.emerald : this.colors.indigo;
            if (nd.depth > 0.2) {
                ctx.shadowBlur = nd.isLand ? 8 : 5;
                ctx.shadowColor = `rgba(${col.r},${col.g},${col.b},${alpha * 0.4})`;
            }
            ctx.beginPath();
            ctx.arc(nd.sx, nd.sy, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Outline ring
        ctx.beginPath();
        ctx.arc(this.globeCX, this.globeCY, this.globeRadius * 0.97, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,102,241,${0.05 * scrollFade})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── FLOATING GEOMETRIC SHAPES ──────────────
    createGeometrics() {
        this.geometrics = [];
        const types = ['hexagon', 'diamond', 'triangle', 'cross', 'ring'];
        const colorPool = [this.colors.indigo, this.colors.pink, this.colors.emerald, this.colors.cyan];
        for (let i = 0; i < this.cfg.geometrics; i++) {
            this.geometrics.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -(0.15 + Math.random() * 0.3), // float upward
                size: 6 + Math.random() * 14,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.008,
                type: types[Math.floor(Math.random() * types.length)],
                color: colorPool[Math.floor(Math.random() * colorPool.length)],
                alpha: 0.04 + Math.random() * 0.08,
            });
        }
    }

    updateGeometrics() {
        for (const g of this.geometrics) {
            g.x += g.vx;
            g.y += g.vy;
            g.rotation += g.rotSpeed;
            // Reset when off top
            if (g.y < -30) {
                g.y = this.height + 30;
                g.x = Math.random() * this.width;
            }
            // Wrap horizontal
            if (g.x < -30) g.x = this.width + 30;
            else if (g.x > this.width + 30) g.x = -30;
        }
    }

    drawGeometrics() {
        const ctx = this.ctx;
        for (const g of this.geometrics) {
            const { x, y, size, rotation, alpha, color, type } = g;
            ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();
            switch (type) {
                case 'hexagon':
                    for (let i = 0; i < 6; i++) {
                        const a = (Math.PI / 3) * i;
                        const px = Math.cos(a) * size, py = Math.sin(a) * size;
                        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
                case 'diamond':
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.6, 0);
                    ctx.lineTo(0, size);
                    ctx.lineTo(-size * 0.6, 0);
                    ctx.closePath();
                    break;
                case 'triangle':
                    for (let i = 0; i < 3; i++) {
                        const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
                        const px = Math.cos(a) * size, py = Math.sin(a) * size;
                        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
                case 'cross':
                    ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
                    ctx.moveTo(0, -size); ctx.lineTo(0, size);
                    break;
                case 'ring':
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    break;
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // ── GRADIENT ORBS ──────────────────────────
    createOrbs() {
        this.orbs = [];
        const colorPool = [this.colors.indigo, this.colors.pink, this.colors.emerald];
        for (let i = 0; i < this.cfg.orbs; i++) {
            const c = colorPool[i % colorPool.length];
            this.orbs.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                radius: 120 + Math.random() * 200,
                color: c,
                alpha: 0.025 + Math.random() * 0.035,
            });
        }
    }

    updateOrbs() {
        for (const o of this.orbs) {
            o.x += o.vx;
            o.y += o.vy;
            // Soft bounce
            if (o.x < -o.radius) o.vx = Math.abs(o.vx);
            else if (o.x > this.width + o.radius) o.vx = -Math.abs(o.vx);
            if (o.y < -o.radius) o.vy = Math.abs(o.vy);
            else if (o.y > this.height + o.radius) o.vy = -Math.abs(o.vy);
        }
    }

    drawOrbs() {
        const ctx = this.ctx;
        for (const o of this.orbs) {
            const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius);
            grad.addColorStop(0, `rgba(${o.color.r},${o.color.g},${o.color.b},${o.alpha})`);
            grad.addColorStop(1, `rgba(${o.color.r},${o.color.g},${o.color.b},0)`);
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    // ── EVENTS ─────────────────────────────────
    bindEvents() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
            this.mouseInfluenceY = ((e.clientX / this.width) - 0.5) * 0.006;
            this.mouseInfluenceX = ((e.clientY / this.height) - 0.5) * 0.25;
        });
        window.addEventListener('mouseleave', () => {
            this.mouse.active = false;
            this.mouse.x = null;
            this.mouse.y = null;
            this.mouseInfluenceX = 0;
            this.mouseInfluenceY = 0;
        });
        window.addEventListener('scroll', () => { this.scrollY = window.scrollY; }, { passive: true });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.adjustForScreen();
                this.resize();
                // Clamp particles
                for (const p of this.particles) {
                    if (p.x > this.width) p.x = Math.random() * this.width;
                    if (p.y > this.height) p.y = Math.random() * this.height;
                }
            }, 200);
        });
    }

    // ── ANIMATION LOOP ─────────────────────────
    animate() {
        this.time = performance.now();
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Layer 1: Ambient gradient orbs (bottom)
        this.updateOrbs();
        this.drawOrbs();

        // Layer 2: 3D Earth Globe
        if (this.showGlobe && this.globeNodes.length) {
            this.drawGlobe();
        }

        // Layer 3: Neural grid particles + connections
        this.updateParticles();
        this.drawParticles();

        // Layer 4: Floating geometric shapes
        this.updateGeometrics();
        this.drawGeometrics();

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
}

window.NeuralGrid = NeuralGrid;
