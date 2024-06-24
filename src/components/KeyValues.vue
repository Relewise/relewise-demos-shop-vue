<template>
    <label class="text-sm block mt-6">{{ title }}</label>
    <div class="flex flex-col gap-4">
        <div v-for="(value, index) in internalValue" :key="index" class="flex gap-4">
            <input v-model="value.key" type="text" placeholder="Key">
            <input v-model="value.value" type="text" placeholder="Value">
            <button class="bg-gray-500 text-white" @click="remove(index)">
                Remove
            </button>
        </div>
        <div>
            <button class="outline" @click="addKeyValue">
                Add new
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { computed, type PropType } from 'vue';

export type KeyValue = {
    key: string;
    value: string | null;
}

const props = defineProps({
    modelValue: { type: Object as PropType<KeyValue[]>, required: true },
    title: { type: String, required: true },
});
const { modelValue } = toRefs(props);
const emit = defineEmits(['update:modelValue']);

const internalValue = computed({
    get: () => {
        return modelValue.value;
    },
    set: (v) => {
        console.log(v);
        emit('update:modelValue', v);
    },
});

function addKeyValue() {
    internalValue.value.push({ key: '', value: '' });
}

function remove(index: number) {
    internalValue.value.splice(index, 1);
}
</script>