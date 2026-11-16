<script setup lang="ts">
import type { ProductResult } from '@relewise/client';
import { productText } from '@/helpers/renewtechDemo';
defineProps<{ product: ProductResult }>();
</script>

<template>
  <div class="mt-2 text-sm text-slate-700">
    <p v-if="productText(product, 'MPN')">
      Part no. {{ productText(product, 'MPN') }}
    </p>
    <p v-if="productText(product, 'Condition')">
      {{ productText(product, 'Condition') }}
    </p>
    <p v-if="productText(product, 'SourceKind') === 'config'">
      Configuration starting price
    </p>
  </div>
</template>
