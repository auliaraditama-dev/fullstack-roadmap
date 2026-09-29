import js from '@eslint/js';import ts from 'typescript-eslint';import vue from 'eslint-plugin-vue';import astro from 'eslint-plugin-astro';import globals from 'globals';
export default [
 {ignores:['dist/**','node_modules/**','.astro/**','.vercel/**','examples/**','public/**','scripts/service-worker.template.js','test-results/**','playwright-report/**']},
 js.configs.recommended,...ts.configs.recommended,...vue.configs['flat/essential'],...astro.configs.recommended,
 {languageOptions:{globals:{...globals.browser,...globals.node,...globals.serviceworker}}},
 {files:['**/*.vue'],languageOptions:{parserOptions:{parser:ts.parser}},rules:{'vue/multi-word-component-names':'off'}},
 {files:['**/*.astro'],rules:{'@typescript-eslint/no-unused-vars':'off'}},
 {rules:{'@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],'no-undef':'off'}}
];
