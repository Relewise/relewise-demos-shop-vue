<script setup lang="ts">
import type { NavigationItem } from '@/App.vue';
import Newsletter from '@/components/Newsletter.vue';
import type { PropType } from 'vue';

defineProps({
    hasChildCategories: { type: Boolean, required: true },
    mainCategories: { type: Object as PropType<NavigationItem[]>, required: true },
    footer: { type: Object as PropType<NavigationItem[]>, required: true },
});
</script>

<template>
  <div class="waves-pink" />
  <footer
    class="!text-brand-500"
    style="background-color: #FFC1D7;"
  >
    <div class="container px-6 py-12 mx-auto">
      <div class="flex flex-col lg:flex-row gap-8">
        <div class="flex-grow">
          <template v-if="hasChildCategories">
            <div
              v-if="footer"
              class="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
            >
              <div
                v-for="category in footer"
                :key="category.id"
              >
                <h3 class="text-lg font-medium">
                  {{ category.category.displayName }}
                </h3>

                <div
                  v-for="child in category.children"
                  :key="child.category.categoryId ?? ''"
                  class="flex flex-col items-start mt-2 space-y-4"
                >
                  <RouterLink
                    :to="{ name: 'category', params: { id: child.category.categoryId } }"
                    class="text-brand-500 transition-colors duration-200 hover:underline hover:text-brand-500"
                  >
                    {{ child.category.displayName }}
                  </RouterLink>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="mainCategories.length > 0">
            <h3 class="font-medium text-xl mb-2">
              Categories
            </h3>
            <div class="grid grid-cols-2 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
              <div
                v-for="cat in mainCategories"
                :key="cat.id ?? ''"
                class="flex flex-col items-start mt-2 space-y-4"
              >
                <RouterLink
                  :to="{ name: 'category', params: { id: cat.id } }"
                  class="text-brand-500 transition-colors duration-200 hover:underline hover:text-brand-500"
                >
                  {{ cat.category.displayName }}
                </RouterLink>
              </div>
            </div>
          </template>
        </div>


        <div class="mt-8 mb-8 lg:m-0 w-full lg:w-1/4">
          <Newsletter />
        </div>
      </div>

      <hr
        v-if="hasChildCategories || mainCategories.length > 0"
        class="my-6 border-[#e4a8bd] md:my-5"
      >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <img
          src="/logo.svg"
          class="h-11"
          alt="Relewise"
        >

        <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm text-slate-900 sm:justify-end sm:text-right">
          <span>© Copyright {{ new Date().getFullYear() }}</span>
          <span class="text-slate-500">·</span>
          <a
            href="https://docs.relewise.com/docs/intro/demo-shop.html"
            target="_blank"
            rel="noreferrer noopener"
            class="underline underline-offset-2 hover:text-slate-700"
          >
            Documentation
          </a>
          <span class="text-slate-500">·</span>
          <a
            href="https://github.com/Relewise/relewise-demos-shop-vue"
            target="_blank"
            rel="noreferrer noopener"
            class="underline underline-offset-2 hover:text-slate-700"
          >
            GitHub
          </a>
          <span class="text-slate-500">·</span>
          <a
            href="https://relewise.com/contact-us/"
            target="_blank"
            rel="noreferrer noopener"
            class="underline underline-offset-2 hover:text-slate-700"
          >
            Contact Relewise
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>
