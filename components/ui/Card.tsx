import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noHover?: boolean;
}

export function Card({ className = "", noHover = false, ...props }: CardProps) {
    return (
        <div
            className={`card ${className}`}
            style={noHover ? { transform: 'none', boxShadow: 'var(--shadow-md)', transition: 'none' } : undefined}
            {...props}
        />
    );
}
