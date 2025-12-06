import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noHover?: boolean;
}

export function Card({ className = "", noHover = false, ...props }: CardProps) {
    return (
        <div
            className={`card ${noHover ? 'hover:transform-none hover:scale-100' : ''} ${className}`}
            {...props}
        />
    );
}
