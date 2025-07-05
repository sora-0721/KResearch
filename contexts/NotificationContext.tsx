import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Notification } from '../types';
import NotificationToast from '../components/NotificationToast';

type NotificationContextType = (notification: Omit<Notification, 'id'>) => void;

const NotificationContext = createContext<NotificationContextType>(() => {});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, ...notification }]);
    }, []);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={addNotification}>
            {children}
            {createPortal(
                <div className="fixed top-4 right-4 z-[1000] w-full max-w-sm space-y-3">
                    {notifications.map(notification => (
                        <NotificationToast
                            key={notification.id}
                            notification={notification}
                            onClose={() => removeNotification(notification.id)}
                        />
                    ))}
                </div>,
                document.body
            )}
        </NotificationContext.Provider>
    );
};