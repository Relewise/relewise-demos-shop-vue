<script lang="ts" setup>
import type { ProductResult } from '@relewise/client';

const { product } = defineProps<{ product: ProductResult | null | undefined }>();
</script>

<template>
	<div>
		<template v-if="product?.filteredVariants?.length">
			<div class="my-3">
				<div class="text-2xl font-semibold">
					Showing {{ Math.min(product.filteredVariants.length, 10) }} of {{
						product.filteredVariants.length }} variants
				</div>
				<table class="w-full mt-4 border-t border-gray-200 text-left text-sm">
					<thead class="bg-gray-50 text-gray-700 uppercase">
						<tr>
							<th class="py-2 px-3">Image</th>
							<th class="py-2 px-3">Product name</th>
							<th class="py-2 px-3">Variant Id</th>
							<th class="py-2 px-3">Availability</th>
							<th class="py-2 px-3">Price</th>
							<th class="py-2 px-3">Price incl. VAT</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(variant, index) in product.filteredVariants.slice(0, 10)" :key="index"
							class="border-b border-gray-200">
							<td class="py-2 px-3">
								<img :src="variant.data?.Image?.value" alt="Variant Image"
									class="w-12 h-12 object-contain" />
							</td>
							<td class="py-2 px-3">
								{{ variant.displayName }}
							</td>
							<router-link :to="{ path: $route.path, query: { variantId: variant.variantId } }"
								class="text-blue-600 underline">
								{{ variant.variantId }}
							</router-link>
							<td class="py-2 px-3 text-green-600">
								In stock
							</td>
							<td class="py-2 px-3 font-semibold">
								EUR {{ variant.listPrice ?? product.listPrice }}
							</td>
							<td class="py-2 px-3 font-semibold">
								EUR {{ variant.salesPrice ?? product.salesPrice }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</div>
</template>
