import process from 'node:process';

// Skip Husky in CI, production, and when husky isn't installed (e.g. published package installs).
// biome-ignore lint/style/noProcessEnv: a git-hook install script legitimately reads NODE_ENV/CI.
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') process.exit(0);
try {
  const husky = (await import('husky')).default;
  husky();
} catch {
  // husky is a devDependency; skip when it's absent.
}
