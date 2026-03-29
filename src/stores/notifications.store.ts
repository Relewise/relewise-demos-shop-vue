import { toast, type ExternalToast } from 'vue-sonner';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export type Notification = {
    title: string;
    text?: string;
    type: NotificationType;
    duration?: number;
};

const defaultDurations: Record<NotificationType, number> = {
    success: 4000,
    info: 4000,
    warning: 5000,
    error: 7000,
};

class NotificationsStore {

    public push(notification: Notification) {
        const options: ExternalToast = {
            description: notification.text,
            duration: notification.duration ?? defaultDurations[notification.type],
        };

        switch (notification.type) {
        case 'success':
            return toast.success(notification.title, options);
        case 'info':
            return toast.info(notification.title, options);
        case 'warning':
            return toast.warning(notification.title, options);
        case 'error':
            return toast.error(notification.title, options);
        }
    }

    public success(title: string, text?: string, options?: Pick<Notification, 'duration'>) {
        return this.push({ type: 'success', title, text, ...options });
    }

    public info(title: string, text?: string, options?: Pick<Notification, 'duration'>) {
        return this.push({ type: 'info', title, text, ...options });
    }

    public warning(title: string, text?: string, options?: Pick<Notification, 'duration'>) {
        return this.push({ type: 'warning', title, text, ...options });
    }

    public error(title: string, text?: string, options?: Pick<Notification, 'duration'>) {
        return this.push({ type: 'error', title, text, ...options });
    }
}

export default new NotificationsStore();
