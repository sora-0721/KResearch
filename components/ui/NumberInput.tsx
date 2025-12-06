import React from "react";

interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    label?: string;
    className?: string;
}

export function NumberInput({
    value,
    onChange,
    min = 0,
    max = 999,
    label,
    className = ""
}: NumberInputProps) {
    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value, 10);
        if (!isNaN(newValue) && newValue >= min && newValue <= max) {
            onChange(newValue);
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color-secondary)' }}>
                    {label}
                </label>
            )}
            <div className="number-input-container">
                <button
                    type="button"
                    onClick={handleDecrement}
                    aria-label="Decrement"
                    disabled={value <= min}
                >
                    −
                </button>
                <input
                    type="number"
                    value={value}
                    onChange={handleInputChange}
                    min={min}
                    max={max}
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    aria-label="Increment"
                    disabled={value >= max}
                >
                    +
                </button>
            </div>
        </div>
    );
}
