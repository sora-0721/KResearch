import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "primary" | "secondary";
}

export function Badge({ className = "", variant = "primary", ...props }: BadgeProps) {
    const variantClass = variant === "secondary" ? "badge-secondary" : "";
    return (
        <span
            className={`badge ${variantClass} ${className}`}
            {...props}
        />
    );
}
