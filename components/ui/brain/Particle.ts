// Particle class and brain shape utilities for BrainVisualization

export type AgentStateColor = "idle" | "manager" | "worker" | "verifier" | "writer" | "complete" | "failed";

// Returns true if point is inside a brain-like shape (normalized -1 to 1)
export const inBrainShape = (nx: number, ny: number): boolean => {
    const d1 = Math.pow((nx - 0.1) * 1.2, 2) + Math.pow((ny + 0.1) * 1.4, 2);
    const d2 = Math.pow((nx + 0.3) * 1.8, 2) + Math.pow((ny - 0.4) * 2.0, 2);
    return d1 < 0.5 || (d2 < 0.2 && nx < 0.2);
};

export const getPalette = (state: AgentStateColor): number[][] => {
    switch (state) {
        case 'manager': return [[139, 92, 246], [167, 139, 250], [124, 58, 237]];
        case 'worker': return [[249, 115, 22], [251, 146, 60], [234, 88, 12]];
        case 'verifier': return [[16, 185, 129], [52, 211, 153], [5, 150, 105]];
        case 'writer': return [[236, 72, 153], [244, 114, 182], [219, 39, 119]];
        case 'complete': return [[59, 130, 246], [96, 165, 250], [37, 99, 235]];
        case 'failed': return [[239, 68, 68], [248, 113, 113], [220, 38, 38]];
        default: return [[148, 163, 184], [203, 213, 225], [100, 116, 139]];
    }
};

interface ParticleConfig {
    speed: number;
    chaos: number;
}

export class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: number[];
    phase: number;
    originX: number;
    originY: number;

    constructor(w: number, h: number, palette: number[][]) {
        let valid = false;
        let tries = 0;
        this.originX = w / 2;
        this.originY = h / 2;

        do {
            const nx = (Math.random() - 0.5) * 2;
            const ny = (Math.random() - 0.5) * 2;
            if (inBrainShape(nx, ny) || tries > 20) {
                this.originX = (nx * 0.35 + 0.5) * w;
                this.originY = (ny * 0.35 + 0.5) * h;
                valid = true;
            }
            tries++;
        } while (!valid);

        this.x = this.originX;
        this.y = this.originY;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 0.5;
        this.color = palette[Math.floor(Math.random() * palette.length)];
        this.phase = Math.random() * Math.PI * 2;
    }

    update(config: ParticleConfig, t: number) {
        const angle = Math.sin(this.x * 0.015 + t) * Math.cos(this.y * 0.015 + t) * Math.PI * 2;
        this.vx += Math.cos(angle) * 0.02 * config.speed;
        this.vy += Math.sin(angle) * 0.02 * config.speed;
        const dx = this.originX - this.x;
        const dy = this.originY - this.y;
        this.vx += dx * 0.003 * config.chaos;
        this.vy += dy * 0.003 * config.chaos;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.x += this.vx;
        this.y += this.vy;
        this.phase += 0.1;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const pulse = (Math.sin(this.phase) + 1) / 2;
        const currentSize = this.size + pulse;
        const [r, g, b] = this.color;
        const alpha = 0.6 + pulse * 0.4;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
    }
}
