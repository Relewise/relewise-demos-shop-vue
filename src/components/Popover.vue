<template>
    <VDropdown :placement="placement" :arrow="arrow" :triggers="['click']">
        <slot></slot>
        <template #popper>
            <slot name="content" />
        </template>
    </VDropdown>
</template>

<script lang="ts" setup>
import { type PropType, toRefs } from 'vue';
import { Dropdown as VDropdown } from 'floating-vue';

// Values taken from here: https://floating-vue.starpad.dev/api/#placement
export type Placement = 'auto'
    | 'auto-start'
    | 'auto-end'
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'right'
    | 'right-start'
    | 'right-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end';

const props = defineProps({
    placement: { type: String as PropType<Placement>, default: 'bottom-start' },
    arrow: { type: Boolean as PropType<boolean | undefined>, default: undefined },
});
const { placement, arrow } = toRefs(props);
</script>

<style lang="css">
@import 'floating-vue/dist/style.css';
</style>
