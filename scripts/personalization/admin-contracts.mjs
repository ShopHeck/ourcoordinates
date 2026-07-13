import { createHash } from 'node:crypto';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

export function buildMutationVariables(id, templateSuffix) {
  return { product: { id, templateSuffix } };
}

export function commercialFingerprint(product) {
  if (product.variants.pageInfo.hasNextPage || product.media.pageInfo.hasNextPage) {
    throw new Error(`Snapshot pagination incomplete for ${product.handle}`);
  }
  for (const variant of product.variants.nodes) {
    if (variant.media && variant.media.pageInfo.hasNextPage) {
      throw new Error(`Variant media pagination incomplete for ${product.handle}`);
    }
  }
  const value = {
    handle: product.handle,
    title: product.title,
    status: product.status,
    publishedAt: product.publishedAt,
    onlineStoreUrl: product.onlineStoreUrl,
    variants: [...product.variants.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    media: [...product.media.nodes].sort((a, b) => a.id.localeCompare(b.id))
  };
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function validateCatalogContract(item, product) {
  if (item.handle === 'chain-link-necklace-custom-charms') {
    for (const variant of product.variants.nodes) {
      const option = variant.selectedOptions.find((value) => value.name === 'Names');
      if (!option || !/^[2-8]\s+names?$/i.test(option.value)) {
        throw new Error(`Unsupported Names option: ${option ? option.value : 'missing'}`);
      }
    }
  }
  if (item.handle === 'personalized-couple-rings') {
    for (const variant of product.variants.nodes) {
      const names = variant.selectedOptions.map((value) => value.name).sort();
      if (names.join('|') !== 'Ring Size|Style') {
        throw new Error(`Unexpected couple-ring options: ${names.join(', ')}`);
      }
    }
  }
}

export function planAssignments(manifest, products) {
  const byHandle = new Map(products.map((product) => [product.handle, product]));
  const changes = [];
  const verificationMismatches = [];
  for (const item of manifest.products) {
    const product = byHandle.get(item.handle);
    if (!product) throw new Error(`Missing product: ${item.handle}`);
    const actual = product.templateSuffix || '';
    if (!item.mutable) {
      if (actual !== item.templateSuffix) {
        verificationMismatches.push({ handle: item.handle, expected: item.templateSuffix, actual });
      }
      continue;
    }
    if (actual !== item.templateSuffix) {
      changes.push({
        id: product.id,
        handle: item.handle,
        before: actual,
        after: item.templateSuffix,
        fingerprint: commercialFingerprint(product)
      });
    }
  }
  return { changes, verificationMismatches };
}
