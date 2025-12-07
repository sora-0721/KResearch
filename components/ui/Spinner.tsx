import React from "react";

export function Spinner({ className = "" }: { className?: string }) {
    return <div className={`spinner ${className}`} />;
}
