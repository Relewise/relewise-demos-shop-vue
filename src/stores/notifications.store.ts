import { computed, reactive } from 'vue';

export type Notification = {
    title: string;
    text: string;
}

export interface INotifcationsState {
    notifications: Notification[];
}

class NotificationsStore {

    private state = reactive<INotifcationsState>({ notifications: [] });
    private recentNotifications = new Map<string, number>();

    public get notifications() {
        return computed(() => this.state.notifications);
    }

    public push(notification: Notification) {
        const key = `${notification.title}::${notification.text}`;
        const now = Date.now();
        const previousTimestamp = this.recentNotifications.get(key);

        if (previousTimestamp && now - previousTimestamp < 3000) {
            return;
        }

        this.recentNotifications.set(key, now);

        this.state.notifications.push(notification);

        setTimeout(() => {
            this.state.notifications.splice(this.state.notifications.indexOf(notification), 1);
            this.recentNotifications.delete(key);
        }, 10000);
    }
}

export default new NotificationsStore();
