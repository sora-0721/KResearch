import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary";
}

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
    const variantClass = variant === "secondary" ? "btn-secondary" : "";
    return (
        <button
            className={`btn ${variantClass} ${className}`}
            {...props}
        />
    );
}
