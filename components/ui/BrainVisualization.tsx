"use client";

import React, { useEffect, useRef } from "react";
import { Particle, getPalette, AgentStateColor } from "./brain/Particle";

interface BrainVisualizationProps {
    isActive: boolean;
    agentState: AgentStateColor | "clarifying";
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

        const init = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            particles = [];
            const state = agentState === "clarifying" ? "idle" : agentState;
            const palette = getPalette(state as AgentStateColor);
            for (let i = 0; i < 250; i++) {
                particles.push(new Particle(rect.width, rect.height, palette));
            }
        };

        const animate = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            let speed = 1.0, chaos = 1.0;
            if (agentState === 'worker') { speed = 2.0; chaos = 1.5; }
            if (agentState === 'manager') { speed = 1.2; chaos = 0.8; }

            time += 0.01 * speed;
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            for (let i = 0; i < particles.length; i++) {
                particles[i].update({ speed, chaos }, time);
                particles[i].draw(ctx);

                for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 900) {
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
            <div className="absolute inset-0 bg-[var(--accent-color)]/5 blur-3xl rounded-full" />
            <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full" style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
