<script lang="ts" setup>
import { CheckCircleIcon } from '@heroicons/vue/24/outline';
</script>

<template>
  <div class="container mx-auto min-h-[70vh] px-2 py-6 xl:px-0">
    <div class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div class="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-brand-50 via-white to-emerald-50" />
      <div class="absolute right-8 top-10 h-32 w-32 rounded-full bg-brand-100/60 blur-3xl" />
      <div class="absolute left-6 top-24 h-24 w-24 rounded-full bg-emerald-100/70 blur-2xl" />

      <div class="relative mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 lg:px-12 lg:py-16">
        <div class="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircleIcon class="h-8 w-8" />
          </div>

          <h1 class="mt-6 text-4xl font-semibold text-slate-900 lg:text-5xl">
            <span class="underline--yellow inline-block">Thank you</span><span class="text-brand1">.</span>
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600 lg:text-lg">
            Your demo order has been placed and the order event was sent to Relewise.<br><br>
            Keep exploring the shop to  discover more products, inspiration, and personalized experiences.
          </p>

          <div class="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <RouterLink
              to="/"
              class="inline-flex min-w-[12rem] items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Continue shopping
            </RouterLink>
            <RouterLink
              to="/favorites"
              class="inline-flex min-w-[12rem] items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View favorites
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
