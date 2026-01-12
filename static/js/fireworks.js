(function () {
    // Configuration
    const CONFIG = {
        particleCount: 50,
        colors: ['#FFD700', '#C0C0C0', '#FFFFFF', '#E6E6FA', '#191970'], // Gold, Silver, White, Lavender, Midnight Blue
        gravity: 0.05,
        friction: 0.98, // Air resistance
        launchInterval: 800 // ms between launches
    };

    let canvas, ctx;
    let particles = [];
    let fireworks = [];

    function init() {
        const container = document.getElementById('fireworks-container');
        if (!container) return;

        canvas = document.createElement('canvas');
        container.appendChild(canvas);
        ctx = canvas.getContext('2d');

        resize();
        window.addEventListener('resize', resize);

        loop();
        launchFirework();
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Firework {
        constructor(x, targetY) {
            this.x = x;
            this.y = canvas.height;
            this.targetY = targetY;
            this.speed = 12; // Initial Launch speed
            this.angle = -Math.PI / 2; // Straight up
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
            this.hue = Math.random() * 360;
            this.exploded = false;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += CONFIG.gravity; // Gravity acts on the rocket too

            if (this.y <= this.targetY || this.vy >= 0) {
                this.explode();
                return false; // Remove firework
            }
            return true;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
            ctx.fill();
        }

        explode() {
            for (let i = 0; i < CONFIG.particleCount; i++) {
                particles.push(new Particle(this.x, this.y, CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)]));
            }
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1; // Random speed
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.alpha = 1;
            this.decay = Math.random() * 0.015 + 0.005;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= CONFIG.friction;
            this.vy *= CONFIG.friction;
            this.vy += CONFIG.gravity;
            this.alpha -= this.decay;
            return this.alpha > 0;
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function launchFirework() {
        const x = Math.random() * canvas.width;
        const targetY = Math.random() * (canvas.height * 0.5); // Explode in top half
        fireworks.push(new Firework(x, targetY));

        // Schedule next launch with random launch interval
        const nextLaunch = Math.random() * (9000 - 100) + 100;
        setTimeout(launchFirework, nextLaunch);
    }

    function loop() {
        requestAnimationFrame(loop);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail effect
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';

        fireworks = fireworks.filter(fw => {
            fw.draw();
            return fw.update();
        });

        particles = particles.filter(p => {
            p.draw();
            return p.update();
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
