import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function inspectProductHtml(html) {
  const release = html.match(/data-personalization-release="([^"]+)"/)?.[1];
  const contract = html.match(/data-personalization-contract="([^"]+)"/)?.[1];
  if (!release) throw new Error('Missing personalization release marker');
  if (!contract) throw new Error('Missing personalization contract marker');
  const properties = [...html.matchAll(/name="properties\[([^\]]+)\]"/g)].map((match) => match[1]);
  return { release, contract, properties: [...new Set(properties)].sort() };
}

export function assertLiveContract(item, inspection) {
  if (inspection.contract !== item.contract) {
    throw new Error(`${item.handle}: expected ${item.contract}, got ${inspection.contract}`);
  }
  const actualProperties = inspection.properties.filter((property) => !property.startsWith('_')).sort();
  const expectedProperties = [...item.properties].sort();
  if (JSON.stringify(actualProperties) !== JSON.stringify(expectedProperties)) {
    const expected = expectedProperties.length ? expectedProperties.join(', ') : 'no public properties';
    const actual = actualProperties.length ? actualProperties.join(', ') : 'no public properties';
    throw new Error(`${item.handle}: expected ${expected}, got ${actual}`);
  }
}

async function fetchInspection(url) {
  const probe = new URL(url);
  probe.searchParams.set('_oc_release_probe', `${Date.now()}-${Math.random()}`);
  const response = await fetch(probe, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' }
  });
  if (!response.ok) throw new Error(`${response.status} ${probe}`);
  return inspectProductHtml(await response.text());
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[args.indexOf('--url') + 1];
  const expectedRelease = args[args.indexOf('--release') + 1];
  const countValue = args.includes('--count') ? args[args.indexOf('--count') + 1] : '20';
  const count = Number.parseInt(countValue, 10);
  const contractsMode = args.includes('--contracts');
  if (!url || !expectedRelease || !Number.isInteger(count) || count < 1) {
    throw new Error('Use --url URL --release RELEASE [--count N] [--contracts]');
  }

  const releases = [];
  for (let index = 0; index < count; index += 1) {
    const inspection = await fetchInspection(url);
    releases.push(inspection.release);
    if (inspection.release !== expectedRelease) {
      throw new Error(`Probe ${index + 1} returned ${inspection.release}`);
    }
  }
  if (new Set(releases).size !== 1) throw new Error(`Mixed releases: ${releases.join(', ')}`);

  if (contractsMode) {
    const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
    const manifest = JSON.parse(await readFile(resolve(root, 'scripts/personalization/product-contracts.json'), 'utf8'));
    const origin = new URL(url).origin;
    for (const item of manifest.products.filter((entry) => entry.mutable)) {
      const inspection = await fetchInspection(`${origin}/products/${item.handle}`);
      assertLiveContract(item, inspection);
    }
  }

  console.log(`Verified ${count} consecutive responses for ${expectedRelease}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
