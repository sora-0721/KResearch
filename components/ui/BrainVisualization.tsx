"use client";

import React, { useEffect, useRef } from "react";

interface BrainVisualizationProps {
    isActive: boolean;
    agentState: "idle" | "manager" | "worker" | "verifier" | "writer" | "complete" | "failed";
}

export function BrainVisualization({ isActive, agentState }: BrainVisualizationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let time = 0;

        // "Brain Shape" function - Returns true if point is inside a brain-like shape
        // Normalized coordinates (-1 to 1)
        const inBrainShape = (nx: number, ny: number) => {
            // Two lobes / ellipses approximation
            // Main Cerebrum
            const d1 = Math.pow((nx - 0.1) * 1.2, 2) + Math.pow((ny + 0.1) * 1.4, 2);
            // Cerebellum / Lower back
            const d2 = Math.pow((nx + 0.3) * 1.8, 2) + Math.pow((ny - 0.4) * 2.0, 2);

            // Combine with a smoothing min or union
            return d1 < 0.5 || (d2 < 0.2 && nx < 0.2);
        };

        const getPalette = (state: string) => {
            switch (state) {
                case 'manager': return [[139, 92, 246], [167, 139, 250], [124, 58, 237]]; // Violet
                case 'worker': return [[249, 115, 22], [251, 146, 60], [234, 88, 12]]; // Orange
                case 'verifier': return [[16, 185, 129], [52, 211, 153], [5, 150, 105]]; // Emerald
                case 'writer': return [[236, 72, 153], [244, 114, 182], [219, 39, 119]]; // Pink
                case 'complete': return [[59, 130, 246], [96, 165, 250], [37, 99, 235]]; // Blue
                case 'failed': return [[239, 68, 68], [248, 113, 113], [220, 38, 38]]; // Red
                default: return [[148, 163, 184], [203, 213, 225], [100, 116, 139]]; // Slate
            }
        };

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: number[];
            phase: number;
            originX: number; // Target brain position
            originY: number;

            constructor(w: number, h: number, palette: number[][]) {
                // rejection sampling for brain shape
                let valid = false;
                let tries = 0;
                this.originX = w / 2;
                this.originY = h / 2;

                // Find a spot inside the brain shape to target
                do {
                    const nx = (Math.random() - 0.5) * 2; // -1 to 1
                    const ny = (Math.random() - 0.5) * 2; // -1 to 1
                    if (inBrainShape(nx, ny) || tries > 20) {
                        this.originX = (nx * 0.35 + 0.5) * w; // Scale to canvas
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

            update(config: any, t: number) {
                // "Swarm" behavior
                // 1. Noise movement
                const angle = Math.sin(this.x * 0.015 + t) * Math.cos(this.y * 0.015 + t) * Math.PI * 2;
                this.vx += Math.cos(angle) * 0.02 * config.speed;
                this.vy += Math.sin(angle) * 0.02 * config.speed;

                // 2. Attraction to "Brain Origin" (keeps the shape)
                const dx = this.originX - this.x;
                const dy = this.originY - this.y;
                this.vx += dx * 0.003 * config.chaos;
                this.vy += dy * 0.003 * config.chaos;

                // Dampen
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

                // Additive smooth blob
                // Using shadowBlur is expensive but looks very "gorgeous"
                // Let's stick to gradient for performance + looks

                const alpha = 0.6 + pulse * 0.4;
                ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            particles = [];
            const palette = getPalette(agentState);
            // DENSE swarm for "Soul"
            for (let i = 0; i < 250; i++) {
                particles.push(new Particle(rect.width, rect.height, palette));
            }
        };

        const animate = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            // Speed & Chaos config
            let speed = 1.0;
            let chaos = 1.0;
            if (agentState === 'worker') { speed = 2.0; chaos = 1.5; }
            if (agentState === 'manager') { speed = 1.2; chaos = 0.8; }

            time += 0.01 * speed;

            ctx.clearRect(0, 0, width, height);

            // Optional: Faint brain outline trace to reinforce shape?
            // Nah, let the particles define the shape.

            ctx.globalCompositeOperation = 'lighter';

            for (let i = 0; i < particles.length; i++) {
                particles[i].update({ speed, chaos }, time);
                particles[i].draw(ctx);

                // Connect very close neighbors for "Synapse" look
                // Only connect if really close to minimize "web" look, we want "cloud"
                for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 900) { // < 30px
                        const alpha = (1 - distSq / 900) * 0.4;
                        const [r, g, b] = particles[i].color;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        const handleResize = () => init();
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [isActive, agentState]);

    return (
        <div className="relative w-56 h-56 flex items-center justify-center select-none pointer-events-none">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[var(--accent-color)]/5 blur-3xl rounded-full" />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 w-full h-full"
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}
