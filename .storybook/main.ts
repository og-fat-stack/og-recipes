import type { StorybookConfig } from '@storybook/nextjs-vite';
import remarkGfm from 'remark-gfm';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ]
};
export default config;