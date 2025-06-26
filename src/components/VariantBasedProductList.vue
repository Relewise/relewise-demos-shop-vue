<script setup lang="ts">
import { computed, toValue } from 'vue'
import { RouterLink } from 'vue-router'
import type { ProductSearchResponse, ProductResult, VariantResult } from '@relewise/client'
import Pagination from '../components/Pagination.vue';
import contextStore from '@/stores/context.store';
import { type MaybeRef } from 'vue'

const { productResult, page, pageSize, onSearch } = defineProps<{
  productResult: MaybeRef<ProductSearchResponse | null>,
  page: MaybeRef<number>,
  pageSize: MaybeRef<number>,
  onSearch: () => void
}>()

const unwrappedProductResult = computed(() => toValue(productResult))
const unwrappedPage = computed(() => toValue(page))
const unwrappedPageSize = computed(() => toValue(pageSize))

const groupedProducts = computed(() => {
  const result = unwrappedProductResult.value
  const groups: Record<string, ProductResult & { Variants: VariantResult[] }> = {}

  result?.results?.forEach(product => {
    const id = product.productId!
    if (!groups[id]) groups[id] = { ...product, Variants: [] }
    if (product.variant) groups[id].Variants.push(product.variant)
  })

  return Object.values(groups)
})
</script>

<template>
  <div v-if="contextStore.getSwitchOnVariantBasedSearchDisplay()">
    <div v-for="(product, index) in groupedProducts" :key="product.productId ?? 'group-' + index"
         class="bg-white p-4 rounded shadow">
      <!-- Title and Brand -->
      <h3 class="text-lg font-semibold flex justify-between items-center mb-2">
        <RouterLink :to="{ name: 'product', params: { id: product.productId } }" class="text-blue-600 underline">
          <span v-html="product.displayName"></span>
        </RouterLink>
        <span class="text-sm text-gray-500 ml-4">
          {{ product.brand?.displayName }}
        </span>
      </h3>

      <!-- Shared Table -->
      <table class="w-full mt-4 border-t border-gray-200 text-left text-sm">
        <thead class="bg-gray-50 text-gray-700 uppercase">
          <tr>
            <th class="py-2 px-3">Image</th>
            <th class="py-2 px-3 w-[280px]">{{ product.Variants.length > 0 ? 'Variant name' : 'Product name' }}</th>
            <th class="py-2 px-3">{{ product.Variants.length > 0 ? 'Variant ID' : 'Product ID' }}</th>
            <th class="py-2 px-3">Availability</th>
            <th class="py-2 px-3">Price</th>
            <th class="py-2 px-3">Price incl. VAT</th>
          </tr>
        </thead>
        <tbody>
          <!-- Render each variant if present -->
          <tr v-for="(variant, vIndex) in product.Variants.length > 0 ? product.Variants : [null]"
              :key="variant?.variantId ?? 'p-' + index"
              class="border-b border-gray-200">
            <td class="py-2 px-3">
              <img :src="(variant?.data?.Image?.value ?? product.data?.Image?.value)"
                   class="w-12 h-12 object-contain"
                   :alt="variant?.displayName! || product.displayName!" />
            </td>
            <td class="py-2 px-3 w-[280px] truncate whitespace-nowrap overflow-hidden align-top">
              <span v-html="variant?.displayName || product.displayName" />
            </td>
            <td class="py-2 px-3">
              <RouterLink :to="{
                            name: 'product',
                            params: { id: product.productId },
                            ...(variant?.variantId ? { query: { variantId: variant.variantId } } : {}),
                          }" class="block text-blue-600 underline">
                {{ variant?.variantId ?? product.productId }}
              </RouterLink>
            </td>
            <td class="py-2 px-3 text-green-600">In stock</td>
            <td class="py-2 px-3 font-semibold">
              EUR {{ variant?.listPrice ?? product.listPrice }}
            </td>
            <td class="py-2 px-3 font-semibold">
              EUR {{ variant?.salesPrice ?? product.salesPrice }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="py-3 flex justify-center">
      <Pagination
        :total="unwrappedProductResult?.hits ?? 0"
        :modelValue="unwrappedPage"
        :pageSize="unwrappedPageSize"
        @change="onSearch"
      />
    </div>
  </div>
</template>