import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LiquidSliderProps {
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    onInteractionEnd: () => void;
    disabled?: boolean;
    height?: number;
}

const LiquidSlider: React.FC<LiquidSliderProps> = ({ min, max, value, onChange, onInteractionEnd, disabled = false, height = 144 }) => {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const getValueFromPosition = useCallback((yPosition: number) => {
        if (!sliderRef.current) return value;

        const { top, height: sliderHeight } = sliderRef.current.getBoundingClientRect();
        const relativeY = Math.max(0, Math.min(yPosition - top, sliderHeight));
        
        const percentage = 1 - (relativeY / sliderHeight);
        const range = max - min;
        const newValue = Math.round(percentage * range) + min;

        return newValue;
    }, [min, max, value]);

    const handleInteraction = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const newValue = getValueFromPosition(clientY);
        if (newValue !== value) {
            onChange(newValue);
        }
    }, [getValueFromPosition, value, onChange]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            onInteractionEnd();
        }
    }, [isDragging, onInteractionEnd]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            handleInteraction(e);
        }
    }, [isDragging, handleInteraction]);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove as any, { passive: false });
        document.addEventListener('touchend', handleTouchEnd as any);
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove as any);
            document.removeEventListener('touchend', handleTouchEnd as any);
        };
    }, [handleMouseMove, handleMouseUp]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return;
        setIsDragging(true);
        handleInteraction(e);
    };
    
    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return;
        setIsDragging(true);
        handleInteraction(e);
    }
    
    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging) {
            handleInteraction(e);
        }
    }
    
    const handleTouchEnd = () => {
        if (isDragging) {
            setIsDragging(false);
            onInteractionEnd();
        }
    }
    
    const percentage = ((value - min) / (max - min)) * 100;
    const thumbPositionStyle = { bottom: `calc(${percentage}% - 10px)` };

    return (
        <div
            ref={sliderRef}
            className={`relative w-2 rounded-full cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab'} ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{ height: `${height}px` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <div className="absolute inset-0 w-2 h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-full overflow-hidden">
                <div 
                    className="absolute bottom-0 w-full bg-glow-light/50 dark:bg-glow-dark/50"
                    style={{ height: `${percentage}%` }}
                ></div>
            </div>
            <div
                className="absolute w-5 h-5 -left-1.5 rounded-full bg-white/90 dark:bg-gray-300 border border-border-light dark:border-border-dark shadow-lg transition-transform duration-100 ease-out"
                style={thumbPositionStyle}
                role="slider"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-orientation="vertical"
            ></div>
        </div>
    );
};

export default LiquidSlider;
