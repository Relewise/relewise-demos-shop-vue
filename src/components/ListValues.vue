<template>
    <div>
        <label class="text-sm block mt-6">{{ label }}</label>
        <template v-if="!internalItems && internalSingleItem">
            <div class="flex mt-2 gap-2">
                <input v-model="internalSingleItem" type="text" :placeholder="inputPlaceholder">
                <button class="bg-gray-500 text-white" @click="removeItem(0)">
                    Remove
                </button>
            </div>
        </template>
        <template v-else>
            <div v-for="(_, index) in internalItems" :key="index" class="flex mt-2 gap-2">
                <input v-model="internalItems[index]" type="text" :placeholder="inputPlaceholder">
                <button class="bg-gray-500 text-white" @click="removeItem(index)">
                    Remove
                </button>
            </div>
        </template>
        <div class="flex mt-2 gap-2">
            <input v-model="newItem" type="text" :placeholder="newItemPlaceholder">
            <button class="outline" @click="addItem">
                Add
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs } from 'vue';
import contextStore from '@/stores/context.store';

const props = defineProps({
    label: { type: String, required: true },
    items: { type: Array, default: null },
    singleItem: { type: String, default: null },
    inputPlaceholder: { type: String, required: true },
    newItemPlaceholder: { type: String, required: true },
});

const { singleItem, items } = toRefs(props);
const newItem = ref('');

const internalSingleItem = computed({
    get: () => {
        return singleItem.value;
    },
    set: (v) => {
        emit('update:singleItem', v);
    },
});

const internalItems = computed({
    get: () => {
        return items.value ?? [];
    },
    set: (v) => {
        emit('update:items', v);
    },
});


const emit = defineEmits(['update:singleItem', 'update:items']);

function addItem() {
    if (!newItem.value) return;
   
    if (!internalItems.value) {
        internalItems.value = internalSingleItem.value ? [internalSingleItem.value] : [];
    }

    if (!internalSingleItem.value) {
        internalSingleItem.value = newItem.value;
    }

    internalItems.value.push(newItem.value);
    newItem.value = '';
    contextStore.persistState();
}

function removeItem(index: number) {
    if (!internalItems.value) {
        internalItems.value = [];
        internalSingleItem.value = '';
        contextStore.persistState();
        return;
    }

    internalItems.value.splice(index, 1);
    contextStore.persistState();
}
</script>

