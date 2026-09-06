import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '..', '..', 'src', 'client', 'public');

type Manifest = {
  name: string;
  display: string;
  theme_color: string;
  icons: { src: string; sizes: string }[];
};

const manifest = JSON.parse(
  readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf-8'),
) as Manifest;

describe('manifest.webmanifest', () => {
  it('has the fields ADR-0006 requires', () => {
    expect(manifest.name).toBe('Treningslogg');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lists the 192 and 512 px icons, and the files exist', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    for (const icon of manifest.icons) {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      expect(existsSync(iconPath), `${icon.src} should exist on disk`).toBe(true);
    }
  });

  it('has an apple-touch-icon file alongside the manifest', () => {
    expect(existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true);
  });
});
