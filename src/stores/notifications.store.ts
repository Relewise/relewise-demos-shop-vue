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

    public get notifications() {
        return computed(() => this.state.notifications);
    }

    public push(notification: Notification) {

        this.state.notifications.push(notification);

        setTimeout(() => { this.state.notifications.splice(this.state.notifications.indexOf(notification), 1); }, 10000);
    }
}

export default new NotificationsStore();