<template>
    <div class="max-w-[800px] flex flex-col gap-10 mx-auto mt-6 p-2 xl:p-0">
        <h1 class="text-4xl font-semibold text-center">
            <span class="underline--yellow inline-block">THANK YOU</span><span class="text-brand1">!</span>
        </h1>
        <p class="text-center">
            Your order is being processed! <br>
            While you wait, explore our latest collections and discover inspiration for your next purchase
        </p>

        <div class="flex justify-center">
            <RouterLink to="/" class="bg-slate-900 px-6 py-4 font-semibold text-xl text-white rounded shadow-sm">
                Continue shopping
            </RouterLink>
        </div>
    </div>
</template>

<script lang="ts" setup>
</script>