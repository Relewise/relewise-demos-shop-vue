<template>
    <div class="container mx-auto">
        <div class="flex mt-5 border-b ">
            <div :class="(openTab == Tabs.Settings ? 'border-b-2 border-solid border-brand-500' : '') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'" @click="() => openTab = Tabs.Settings">
                <span>
                    Settings
                </span>
            </div>
            <div :class="(openTab == Tabs.Personalization ? 'border-b-2 border-solid border-brand-500' : '') + ' text-black rounded-t cursor-pointer w-36 h-10 flex items-center justify-center text-center'" @click="() => openTab = Tabs.Personalization">
                <span>
                    Personalization
                </span>
            </div>
        </div>
        <div class="">
            <Settings v-if="openTab === Tabs.Settings"/>
            <Personalisation v-if="openTab === Tabs.Personalization"/>
        </div> 
    </div>
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
