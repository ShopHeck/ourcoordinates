import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';

// Product-specific approved release; default is a read-only plan.
const root=fileURLToPath(new URL('../',import.meta.url));
const audit=resolve(root,'../audits/bubble-necklace-2026-09-09/zircon');
const mode=process.argv[2] || 'plan';
assert(['plan','content','media','verify'].includes(mode),'Unknown release mode');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const draft=await readJson(resolve(root,'docs/bubble-necklace/product-update-draft.json'));
const manifest=await readJson(resolve(root,'scripts/bubble-necklace-media.json'));
const target=manifest.products[0];
const id=target.expectedProductId;
assert.equal(id,'gid://shopify/Product/8302991048962');
const operations=new Map((await readFile(resolve(root,'docs/bubble-necklace/release-operations.graphql'),'utf8')).trim().split(/\n\s*\n/).map(text=>[text.match(/^(?:query|mutation) (\w+)/)[1],text]));
const store=(process.env.SHOPIFY_STORE||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
const token=process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
if(!store||!token)throw new Error('Shopify credentials unavailable.');
async function gql(name,variables){
  const r=await fetch(`https://${store}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'content-type':'application/json','x-shopify-access-token':token},body:JSON.stringify({query:operations.get(name),variables})});
  const p=await r.json();
  if(!r.ok||p.errors)throw new Error('Shopify operation failed: '+JSON.stringify(p.errors?.map(e=>e.message)||r.status));
  for(const result of Object.values(p.data)){
    const errors=result?.userErrors || result?.mediaUserErrors;
    if(errors?.length)throw new Error(JSON.stringify(errors));
  }
  return p.data;
}
async function snapshot(){
  const p=(await gql('BubbleReleaseSnapshot',{handle:target.handle})).productByIdentifier;
  assert.equal(p?.id,id);assert.equal(p.status,'ACTIVE');
  assert(!p.variants.pageInfo.hasNextPage&&!p.media.pageInfo.hasNextPage,'Incomplete pagination');
  assert.equal(p.variants.nodes.length,28,'Variant count changed');
  return p;
}
const protectedData=p=>({id:p.id,handle:p.handle,status:p.status,variants:p.variants.nodes.map(({media,...v})=>v)});
const content=p=>({id:p.id,title:p.title,descriptionHtml:p.descriptionHtml,seo:p.seo,templateSuffix:p.templateSuffix});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const save=async(name,p)=>writeFile(resolve(audit,name),JSON.stringify(p,null,2)+'\n');
await mkdir(audit,{recursive:true});
const current=await snapshot();
if(mode==='plan'){
  // Never overwrite the rollback snapshot on a repeat invocation.
  try{await writeFile(resolve(audit,'release-before.json'),JSON.stringify(current,null,2)+'\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  console.log(JSON.stringify({mode,id,variants:current.variants.nodes.length,oldMedia:current.media.nodes.length,newImages:target.media.map(m=>({filename:m.filename,finish:m.finish,alt:m.alt})),content:draft.product,retire:'Detach previous catalog images from this product; retain files for rollback.'},null,2));
  process.exit(0);
}
const before=await readJson(resolve(audit,'release-before.json'));
assert.deepEqual(protectedData(current),protectedData(before),'Variant, price, SKU, or product identity drift');
if(mode==='content'){
  if(isDeepStrictEqual(content(current),draft.product)){console.log('Content already applied.');process.exit(0);}
  assert.deepEqual(content(current),content(before),'Concurrent content edit');
  // Explicit whitelist: no handle, pricing, inventory, SKU, or option mutation.
  const {id,title,descriptionHtml,seo,templateSuffix}=draft.product;
  await gql('BubbleContentUpdate',{product:{id,title,descriptionHtml,seo,templateSuffix}});
  const after=await snapshot();assert.deepEqual(content(after),draft.product);assert.deepEqual(protectedData(after),protectedData(before));
  await save('release-content-after.json',after);console.log('Product description, SEO and template applied; all 28 variants unchanged.');
  process.exit(0);
}
const chosen=target.media.map(m=>{
  const matches=current.media.nodes.filter(x=>x.alt===m.alt);
  assert.equal(matches.length,1,'Missing or duplicate candidate: '+m.filename);
  assert.equal(matches[0].preview.status,'READY','Media not ready');
  return {...m,id:matches[0].id};
});
const byFinish=new Map(chosen.filter(m=>m.role==='worn lifestyle').map(m=>[m.finish,m.id]));
assert.equal(byFinish.size,4);
const variantUpdates=current.variants.nodes.map(v=>({id:v.id,mediaId:byFinish.get(v.selectedOptions.find(o=>o.name==='Color').value)}));
assert(variantUpdates.every(v=>v.mediaId));
const orderNames=['bubble-j-necklace-worn-v2.webp','gold-zircon-worn-v2.webp','silver-zircon-worn-v2.webp','silver-bubble-olivia-worn-v2.webp','gold-zircon-gift-v2.webp','silver-zircon-gift-v2.webp','bubble-j-necklace-gift-v2.webp'];
const orderedIds=orderNames.map(filename=>chosen.find(m=>m.filename===filename).id);
const oldIds=new Set(before.media.nodes.map(m=>m.id));
assert(current.media.nodes.every(m=>oldIds.has(m.id)||chosen.some(n=>n.id===m.id)),'Unreviewed gallery change');
if(mode==='media'){
  const alreadyMapped=variantUpdates.every(v=>current.variants.nodes.find(x=>x.id===v.id).media.nodes.some(m=>m.id===v.mediaId));
  if(!alreadyMapped)await gql('BubbleVariantImages',{productId:id,variants:variantUpdates});
  const mapped=await snapshot();
  assert(variantUpdates.every(v=>mapped.variants.nodes.find(x=>x.id===v.id).media.nodes.some(m=>m.id===v.mediaId)),'New variant associations missing');
  const retire=mapped.media.nodes.filter(m=>oldIds.has(m.id));
  if(retire.length)await gql('BubbleDetachOldGallery',{files:retire.map(m=>({id:m.id,referencesToRemove:[id]}))});
  for(let n=0;n<20;n++){
    const fresh=await snapshot();if(fresh.media.nodes.length===orderedIds.length)break;
    if(n===19)throw new Error('Gallery detach did not finish');await sleep(1500);
  }
  const job=(await gql('BubbleGalleryOrder',{id,moves:orderedIds.map((id,index)=>({id,newPosition:String(index)}))})).productReorderMedia.job;
  if(job)for(let n=0;!job.done&&n<20;n++){
    await sleep(1500);const latest=(await gql('BubbleGalleryJob',{id:job.id})).job;
    if(latest.done)break;if(n===19)throw new Error('Gallery ordering job not complete');
  }
}
const after=await snapshot();
assert.deepEqual(protectedData(after),protectedData(before));assert.deepEqual(content(after),draft.product);
assert.deepEqual(after.media.nodes.map(m=>m.id),orderedIds,'Final gallery order mismatch');
for(const v of after.variants.nodes)assert.deepEqual(v.media.nodes.map(m=>m.id),[variantUpdates.find(x=>x.id===v.id).mediaId],'Variant image mismatch');
await save('release-after.json',after);
console.log(JSON.stringify({mode,verified:true,product:id,variants:28,galleryImages:after.media.nodes.length,template:after.templateSuffix,seo:after.seo},null,2));
