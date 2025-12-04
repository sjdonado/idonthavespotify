import * as path from 'node:path';

import { mkdir, writeFile } from 'fs/promises';

import { allSnapshotTargets } from '../tests/mocks/snapshots';

const USER_AGENT = 'facebookexternalhit/1.1';

async function fetchSnapshot(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function saveSnapshots() {
  for (const target of Object.values(allSnapshotTargets)) {
    const snapshotPath = path.resolve(process.cwd(), target.file);
    await mkdir(path.dirname(snapshotPath), { recursive: true });

    const body = target.staticBody ?? (await fetchSnapshot(target.url));
    await writeFile(snapshotPath, body, 'utf8');
    console.log(`Saved snapshot for ${target.url} -> ${target.file}`);
  }
}

void saveSnapshots();
