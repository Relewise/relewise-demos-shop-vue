<template>
    <div class="flex gap-2">
        <div :class="(openTab == Tabs.Settings ? 'bg-white' : 'bg-gray-50') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'" @click="() => openTab = Tabs.Settings">
            <span>
                Settings
            </span>
        </div>
        <div :class="(openTab == Tabs.Personalization ? 'bg-white' : 'bg-gray-50') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'" @click="() => openTab = Tabs.Personalization">
            <span>
                Personalization
            </span>
        </div>
    </div>
    
    <Settings v-if="openTab === Tabs.Settings" class="bg-white rounded-tr rounded-b"/>
    <Personalisation v-if="openTab === Tabs.Personalization" class="bg-white rounded-tr rounded-b"/>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Personalisation from '../components/Personalisation.vue';
import Settings from '../components/DatasetSettings.vue';

enum Tabs {
    Settings,
    Personalization
}

const openTab = ref(Tabs.Settings);
</script>
