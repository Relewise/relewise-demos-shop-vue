<template>
    <div>
      <div class="w-full flex items-center justify-between mb-5 gap-2">
        <input
          v-model.number="internalValue[0]"
          type="text"
          class="small"
          @keypress.enter="emitUpdate"
          @blur="emitUpdate"
        />
        -
        <input
          v-model.number="internalValue[1]"
          type="text"
          class="small"
          @keypress.enter="emitUpdate"
          @blur="emitUpdate"
        />
      </div>
  
      <div v-if="min !== undefined && max !== undefined" class="px-1">
        <Slider
          v-model="internalValue"
          :tooltips="false"
          :max="max"
          :min="min"
          @update="emitUpdate"
        />
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue';
  import Slider from '@vueform/slider';
import type { DoubleNullableProductDataRangeFacetResult, PriceRangeFacetResult } from '@relewise/client';
  

const props = defineProps<{
  facet: PriceRangeFacetResult | DoubleNullableProductDataRangeFacetResult;
  value: [string, string];
  min?: number | null | undefined;
  max?: number | null | undefined;
}>();
  
  const emit = defineEmits(['update:value', 'update']);
  
  const internalValue = ref<[string, string]>([
    String(props.value[0] ?? ''),
    String(props.value[1] ?? ''),
  ]);
  

  watch([() => props.value, () => props.facet], ([val]) => {
  internalValue.value = [String(val?.[0] ?? ''), String(val?.[1] ?? '')];
});

 
  function emitUpdate() {
    emit('update:value', internalValue.value);
    emit('update');
  }
  </script>
  
  <style src="@vueform/slider/themes/default.css"></style>