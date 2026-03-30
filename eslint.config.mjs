import pluginVue from 'eslint-plugin-vue';
import tailwindcss from 'eslint-plugin-tailwindcss';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    pluginVue.configs['flat/recommended'],
    vueTsConfigs.recommended,
    {
        plugins: {
            tailwindcss,
        },
        rules: {
            'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            eqeqeq: ['error', 'smart'],
            'no-return-assign': 'off',
            'prefer-promise-reject-errors': 'off',
            'space-before-function-paren': ['error', 'never'],
            'vue/no-v-html': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off',
            'vue/no-parsing-error': 'off',
            'vue/no-use-v-if-with-v-for': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'tailwindcss/no-custom-classname': 'off',
        },
    },
);
