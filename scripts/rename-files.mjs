import { readdir, rename } from 'node:fs/promises';
import { join, extname } from 'node:path';

/**
 * @param {string} dir
 * @param {string} from
 * @param {string} to
 * @returns {Promise<void>}
 */
async function walk({ dir, from, to }) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
    } else if (extname(path) === from) {
      const mapFilePath = `${path}.map`;

      await rename(path, path.slice(0, -from.length) + to);
      await rename(mapFilePath, mapFilePath.slice(0, -(from.length + 4)) + `${to}.map`);
    }
  }
}

await walk({
  dir: join(process.cwd(), process.argv[2]),
  from: process.argv[3],
  to: process.argv[4],
});
