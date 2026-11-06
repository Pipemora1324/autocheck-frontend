import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', '.angular/', 'coverage/', 'node_modules/', 'public/', 'scripts/'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: { project: ['./tsconfig.app.json', './tsconfig.spec.json'], tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      // Las páginas enrutadas se nombran *Page: es la convención del proyecto.
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component', 'Page'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Validators.required y compañía son estáticos y no dependen de this.
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      // Una clase vacía con @Component es una página solo de plantilla.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }]
    }
  },
  {
    // El componente raíz se llama App, como genera Angular.
    files: ['src/app/app.ts'],
    rules: { '@angular-eslint/component-class-suffix': 'off' }
  },
  {
    // Las pruebas leen el DOM y respuestas simuladas: un valor inesperado hace fallar la aserción.
    files: ['src/**/*.spec.ts', 'src/testing/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off'
    }
  },
  {
    files: ['src/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility]
  },
  prettier
);
