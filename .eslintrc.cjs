module.exports = {
    root: true,
    env: {
        node: true,
    },
    plugins: [
        'tailwindcss',
    ],
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-recommended',
        '@vue/eslint-config-typescript',
    ],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'vue/html-indent': ['error', 4],
        indent: ['error', 4],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        'comma-dangle': ['error', 'always-multiline'], // Reasoning behind using dangling commas -> https://github.com/airbnb/javascript#commas--dangling
        'no-useless-constructor': 'off', // che: Bug in rule - unless disabled makes eslint crash
        'standard/no-callback-literal': 'off', // che: useless rule
        eqeqeq: ['error', 'smart'],
        'no-return-assign': 'off',
        'prefer-promise-reject-errors': 'off',
        'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'space-before-function-paren': ['error', 'never'],
        'vue/html-closing-bracket-newline': [
            'error',
            {
                singleline: 'never',
                multiline: 'never',
            },
        ],
        'vue/html-self-closing': ['error', {
            html: {
                void: 'never',
                normal: 'any',
                component: 'always',
            },
            svg: 'always',
            math: 'always',
        }],
        'vue/html-closing-bracket-spacing': ['error', {
            startTag: 'never',
            endTag: 'never',
            selfClosingTag: 'never',
        }],
        'vue/max-attributes-per-line': ['error', {
            'singleline': {
                'max': 4,
            },
            'multiline': {
                'max': 1,
            },
        }],
        'vue/no-v-html': 'off',
        'vue/first-attribute-linebreak': 0,
        'vue/require-default-prop': 0,
        'vue/require-explicit-emits': 0,
        'vue/order-in-components': 0,
        'vue/no-v-text-v-html-on-component': 0,
        'vue/multi-word-component-names': 'off',
        '@typescript-eslint/no-unused-vars': [2, { args: 'none' }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'tailwindcss/no-custom-classname': 'off',
    },
    parserOptions: {
        parser: '@typescript-eslint/parser',
    },
};