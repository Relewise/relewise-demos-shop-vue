<template>
    <div class="absolute top-[10px] right-[25px] w-1/6 z-[99999]">
        <div v-for="(notification, index) in notifications" :key="index" class="w-full max-w-sm mx-auto my-2 overflow-hidden rounded shadow-sm">
            <div class="relative flex items-center justify-between px-2 py-2 font-semibold text-white bg-red-500 rounded-t">
                <div class="relative flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor"
                         class="inline w-6 h-6 mr-2 opacity-75">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{{ notification.title }}</span>
                </div>
            </div>
            <div class="p-3 bg-white border border-gray-300 rounded-b shadow-lg">
                <span class="block text-gray-600">{{ notification.text }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import notificationsStore from '@/stores/notifications.store';
import { ref } from 'vue';

const notifications = ref(notificationsStore.notifications);

</script>