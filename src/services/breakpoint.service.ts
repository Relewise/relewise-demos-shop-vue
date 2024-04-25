import { useBreakpoints } from '@vueuse/core';
import { computed, type ComputedRef } from 'vue';

class BreakpointsService {
    private breakpoints = useBreakpoints({
        mobile: 0, // optional
        tablet: 1024,
        desktop: 1280,
    });
      
    // Can be 'mobile' or 'tablet' or 'laptop' or 'desktop'
    public get active(): ComputedRef<string> {
        return computed(() => this.breakpoints.active().value ?? 'desktop');
    }
}

export default new BreakpointsService();