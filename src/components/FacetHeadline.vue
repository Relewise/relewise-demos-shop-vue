<template>
	<h4 class="font-semibold text-lg mb-1">
	  {{
		('key' in facet && typeof facet.key === 'string'
		  ? facet.key
		  : facet.field
		).split(/(?=[A-Z])/).join(' ')
	  }}
	</h4>
  </template>
  
  <script setup lang="ts">
  import type { FacetResult } from '@relewise/client';
  
  const props = defineProps<{
	facet: FacetResult;
  }>();
  
  const facet = props.facet;
  </script>