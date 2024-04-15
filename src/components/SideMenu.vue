<script setup lang="ts">
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline';
import { ref } from 'vue';

const menuOpen = ref<boolean>(false);

function toggleMenu() {
    menuOpen.value = !menuOpen.value;
}

</script>

<template>
    <div class="lg:hidden m-2" @click="toggleMenu">
        <Bars3Icon class="h-8 w-8" />
    </div>
    <Teleport to="#modal">
        <div v-if="menuOpen" class="modal">
            <div class="lg:hidden m-2 flex justify-end">
                <XMarkIcon class="h-8 w-8 items-end" @click="toggleMenu"/>
            </div>
        </div>
    </Teleport>
</template>

<style scoped lang="scss">
$headerHeight: 104px;

.modal {
    @apply bg-zinc-50 overflow-scroll;
    position: fixed;
    z-index: 999;
    top: 0; // height of header
    left: 0;
    width: 100%;
    height: 100%;
}
:root {
    --relewise-grid-template-columns: repeat(5, 1fr); 
}
</style>