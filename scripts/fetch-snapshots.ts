import * as path from 'node:path';

import { mkdir, writeFile } from 'fs/promises';

import { allSnapshotTargets, type SnapshotTarget } from '../tests/mocks/snapshots';

const USER_AGENT = 'facebookexternalhit/1.1';

async function fetchSnapshot(target: SnapshotTarget) {
  const options: RequestInit = {
    method: target.method ?? 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      ...target.requestHeaders,
    },
  };

  if (target.method === 'POST' && target.requestBody) {
    options.body = target.requestBody;
  }

  const response = await fetch(target.url, options);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${target.url}: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

async function saveSnapshots() {
  for (const value of Object.values(allSnapshotTargets)) {
    const target = value as SnapshotTarget;
    const snapshotPath = path.resolve(process.cwd(), target.file);
    await mkdir(path.dirname(snapshotPath), { recursive: true });

    const body = target.staticBody ?? (await fetchSnapshot(target));
    await writeFile(snapshotPath, body, 'utf8');
    console.log(`Saved snapshot for ${target.url} -> ${target.file}`);
  }
}

void saveSnapshots();
