import React, { useEffect, useState } from 'react';
import { Notification, NotificationType } from '../types';

const ICONS: Record<NotificationType, React.ReactNode> = {
    success: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    error: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    warning: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    ),
    info: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
};

const BORDER_COLORS: Record<NotificationType, string> = {
    success: 'border-green-500/50',
    error: 'border-red-500/50',
    warning: 'border-yellow-500/50',
    info: 'border-blue-500/50',
};

interface NotificationToastProps {
    notification: Notification;
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, notification.duration || 5000);

        return () => clearTimeout(timer);
    }, [notification, onClose]);

    const handleAnimationEnd = () => {
        if (isExiting) {
            onClose();
        }
    };

    return (
        <div
            className={`
                w-full bg-card-bg-light dark:bg-glass-dark 
                backdrop-blur-[25px]
                border-l-4 ${BORDER_COLORS[notification.type]}
                rounded-lg 
                shadow-glass shadow-shadow-light dark:shadow-shadow-dark
                flex items-start p-4 gap-3
                animate-fade-in
                ${isExiting ? 'animate-fade-out' : 'animate-slide-in-right'}
            `}
            onAnimationEnd={handleAnimationEnd}
            role="alert"
            aria-live="assertive"
        >
            <div className="flex-shrink-0">{ICONS[notification.type]}</div>
            <div className="flex-grow">
                <p className="font-bold text-gray-900 dark:text-gray-100">{notification.title}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">{notification.message}</p>
            </div>
            <button onClick={() => setIsExiting(true)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0" aria-label="Close notification">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

export default NotificationToast;