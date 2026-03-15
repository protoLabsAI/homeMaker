import { defineConfig } from 'vitepress';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Auto-generate sidebar items from a directory of markdown files.
 * Reads .md files, extracts the first H1 as the label, and sorts alphabetically.
 * Skips README.md and index.md (those are section landing pages).
 */
function generateSidebar(dir: string, basePath: string): { text: string; link: string }[] {
  const docsRoot = path.resolve(__dirname, '..');
  const fullDir = path.join(docsRoot, dir);

  if (!fs.existsSync(fullDir)) return [];

  return fs
    .readdirSync(fullDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'index.md')
    .map((f) => {
      const content = fs.readFileSync(path.join(fullDir, f), 'utf-8');
      const match = content.match(/^#\s+(.+)$/m);
      const text = match ? match[1] : f.replace('.md', '');
      const link = `${basePath}/${f.replace('.md', '')}`;
      return { text, link };
    })
    .sort((a, b) => a.text.localeCompare(b.text));
}

export default defineConfig({
  title: 'homeMaker',
  description: 'Home management hub for projects, budgets, sensors, and secrets',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  ignoreDeadLinks: false,

  themeConfig: {
    logo: '/logo.svg',

    search: {
      provider: 'local',
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get started', link: '/getting-started/' },
      { text: 'Modules', link: '/modules/inventory' },
      {
        text: 'More',
        items: [
          { text: 'Deployment', link: '/deployment/docker' },
          { text: 'Platform', link: '/platform/how-it-works' },
          { text: 'Integrations', link: '/integrations/weather' },
        ],
      },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting started',
          items: generateSidebar('getting-started', '/getting-started'),
        },
      ],
      '/modules/': [
        {
          text: 'Modules',
          items: generateSidebar('modules', '/modules'),
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment',
          items: generateSidebar('deployment', '/deployment'),
        },
      ],
      '/platform/': [
        {
          text: 'Platform',
          items: generateSidebar('platform', '/platform'),
        },
      ],
      '/integrations/': [
        {
          text: 'Integrations',
          items: generateSidebar('integrations', '/integrations'),
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/your-org/homeMaker' }],

    footer: {
      message: 'homeMaker — open source home management',
    },
  },
});
