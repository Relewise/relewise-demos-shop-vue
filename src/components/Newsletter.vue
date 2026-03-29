<template>
  <h3 class="text-lg font-medium">
    Subscribe to our newsletter
  </h3>
  <div class="flex mt-2 gap-2">
    <input
      v-model="email"
      type="text"
      :disabled="!trackingEnabled"
      :title="!trackingEnabled ? disabledTrackingMessage : undefined"
      :class="[
        '!shadow-none !bg-slate-100 !border-slate-100 focus:!border-slate-100', 
        { '!border-red-500 focus:!ring-red-500': !isValidEmail }
      ]"
      placeholder="Email"
      @keyup.enter="subscribe"
    >
    <button
      class="bg-brand-500 text-white" 
      :title="!trackingEnabled ? disabledTrackingMessage : undefined"
      :disabled="!trackingEnabled || (!isValidEmail && email.length > 0)" 
      @click="subscribe"
    >
      Subscribe
    </button>
  </div>
  <p
    v-if="!trackingEnabled"
    class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
  >
    {{ disabledTrackingMessage }}
  </p>
  <span
    v-if="success === true"
    class="flex items-center"
  >
    <CheckCircleIcon class="w-5 h-5 text-green-500 mr-1" />
    <span>Thanks for subscribing!</span>
  </span>
  <span
    v-else-if="success === false"
    class="text-red-500"
  >Something went wrong, please try again...</span>
</template>
<script setup lang="ts">
import contextStore from '@/stores/context.store';
import trackingService from '@/services/tracking.service';
import { computed, ref, watch } from 'vue';
import { CheckCircleIcon } from '@heroicons/vue/24/solid';

const email = ref('');
const success = ref<boolean | undefined>();
const isValidEmail = ref(true);
const trackingEnabled = computed(() => contextStore.tracking.value.enabled);
const disabledTrackingMessage = 'To subscribe to the newsletter, enable tracking in the demo shop context.';

// Email validation using regex
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

watch(email, () => {
    isValidEmail.value = email.value.length === 0 || emailRegex.test(email.value);
    
}, { immediate: true });

async function subscribe() {
    if (!trackingEnabled.value || !isValidEmail.value || !email.value) {
        return;
    }
    
    success.value = await trackingService.trackUserUpdate(email.value);

    if (success.value) {
        email.value = '';
    }
}

</script>
