import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist', 'drizzle'],
  },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
    },
  },
);
