import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { productContentFingerprint, validateDescriptionBatch, validateProductDescriptionUpdate } from './product-description-contracts.mjs';

const [snapshotArgument, outputArgument = '.product-admin-work/description-wave-one.json'] = process.argv.slice(2);
if (!snapshotArgument) {
  throw new Error('Usage: node scripts/prepare-product-description-wave-one.mjs <snapshot.json> [output.json]');
}

const snapshotPath = resolve(snapshotArgument);
const outputPath = resolve(outputArgument);
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const byHandle = new Map(snapshot.products.map((product) => [product.handle, product]));

const descriptions = {
  'leather-coordinate-bracelet': `
<p>A place can fit into six characters: the latitude of a hometown, the initials from a first trip, or the date everything changed. This leather coordinates bracelet gives those small details four distinct engraving lines instead of squeezing the whole story onto one plate.</p>
<p>The bracelet combines a genuine leather band with three stainless-steel plates and an adjustable buckle. Choose white, brown, or black leather, then arrange the engraving in the live preview before adding it to the cart.</p>
<h2>How the four engraving lines are arranged</h2>
<ul>
  <li>Two horizontal lines on the square plate</li>
  <li>One horizontal line on the middle steel bar</li>
  <li>One horizontal line on the bottom steel bar</li>
  <li>Six characters maximum on each line, including spaces and symbols</li>
  <li>A live preview that keeps the four placements visually separate</li>
</ul>
<p>A coordinate pair fits naturally across the two square lines. The slim bars can carry a short date, initials, a compact word, or remain blank. What appears in the preview is organized in the same four-part order sent with the purchase.</p>
<h2>Choose the details before ordering</h2>
<p>Check the map pin first, then review every letter, number, direction, space, and symbol. The six-character limit is intentionally strict because the engraving areas are narrow. The adjustable buckle handles fit changes without changing the plate layout, while the leather develops its own wear pattern over time.</p>`,

  'coordinates-bracelet': `
<p>The Coordinates Cuff Bracelet keeps one location visible without explaining it to everyone who sees it. A latitude-and-longitude line sits in the front channel of the open cuff, turning a first address, ceremony site, hometown, or meeting place into a quiet daily reference.</p>
<p>Use the location finder to begin with a map pin or enter a coordinate pair you have already verified. The live preview helps you judge spacing before the exact engraving is carried into the cart.</p>
<h2>What makes this cuff different</h2>
<ul>
  <li>One custom engraving line with room for up to 30 characters</li>
  <li>Adjustable open-cuff shape that can be eased to the wrist</li>
  <li>Gold, silver, rose-gold, and black color choices</li>
  <li>Stainless-steel construction with the engraving centered at the front</li>
</ul>
<p>The slim profile works on its own and also leaves room beside a watch or another bracelet. Because the coordinates read as numbers rather than a name, the meaning can stay private until the wearer chooses to share it.</p>
<h2>Before the cuff reaches the bench</h2>
<p>Paste the finished coordinate pair back into a map and confirm the pin. Direction letters, minus signs, degree symbols, spaces, and punctuation all count toward the line limit. If privacy matters, use a nearby landmark or slightly reduced precision rather than a home’s exact point. The cart shows the submitted engraving so you can make one last character-by-character check before checkout.</p>`,

  'coordinates-necklace': `
<p>This vertical coordinates necklace is built for stories that need more than one surface. Put the location on the front and use the remaining selected sides for a date, names, initials, or a second short line that makes the numbers understandable to the person wearing it.</p>
<p>The bar pendant is approximately 35 mm by 5 mm. Black, silver, rose-gold, and gold finishes are available, with variants for one, two, three, or four engraved sides.</p>
<h2>Plan the pendant one side at a time</h2>
<ul>
  <li>Front: the primary coordinate or message</li>
  <li>Back: a second line, date, or longitude</li>
  <li>Left and right: optional details on three- and four-side selections</li>
  <li>Up to 15 characters on each active side</li>
  <li>Only the sides enabled by the selected variant are submitted</li>
</ul>
<p>The personalization fields follow the side count selected above them. Inactive sides are not added to the purchase, which prevents an accidental extra line from reaching fulfillment.</p>
<h2>Make the engraving legible</h2>
<p>Short text suits the narrow pendant better than a sentence. A coordinate pair can be divided between the front and back, while a single compact format may fit on one face. Check every active surface in the preview and again in the cart. For a gift, keep a note with the full place name—the pendant can remain visually spare while the card explains why that location belongs on it.</p>`,

  'matching-coordinates-necklaces': `
<p>These matching coordinates necklaces are a pair, but the engravings do not have to be identical. Use the same place on both vertical pendants, mark the two cities in a long-distance relationship, or give each person the location where the other feels most like home.</p>
<p>The set is available in gold, rose-gold, silver, and black finishes. Each selected style includes two necklaces and supports its corresponding number of engraved sides.</p>
<h2>Necklace A and Necklace B stay separate</h2>
<ul>
  <li>Two vertical bar necklaces are included</li>
  <li>Shared mode repeats one engraving across the pair</li>
  <li>Separate mode preserves a different line in each clearly labeled field</li>
</ul>
<p>The two-piece preview is there to catch mix-ups before checkout. Read Necklace A and Necklace B independently; do not assume a correction on one automatically changes the other.</p>
<h2>Choose what connects the pair</h2>
<p>A first apartment, a campus, a deployment homecoming point, a wedding venue, or two hometowns can all work. Verify both locations in a map before entering them. If the selected style opens additional sides, keep each line concise and use them for a date or name rather than repeating the same coordinates. The finished set should feel related because of the story, even when the two engravings are different.</p>`,

  'custom-birthstone-rings': `
<p>This two-name birthstone ring is centered on a relationship rather than a generic monogram. One name follows each side of the open design, meeting beside the two birthstone-style accents shown in the product images.</p>
<p>The order form intentionally asks for Name 1 and Name 2. Keeping those entries separate removes guesswork about spelling and placement when the ring is prepared.</p>
<h2>What you personalize</h2>
<ul>
  <li>One required engraving for Name 1</li>
  <li>One required engraving for Name 2</li>
  <li>Up to 20 characters in each name field</li>
  <li>The two-stone configuration shown with the available product option</li>
</ul>
<p>The design can represent partners, children, siblings, close friends, or two generations of a family. It works best when the names are entered exactly as the recipients use them—not shortened or reformatted unless that is intentional.</p>
<h2>Review the pair as a single design</h2>
<p>Check capitalization, accents, hyphens, and name order before adding the ring to the cart. The available listing does not present separate stone, finish, band, or size selectors, so the images and current product option define those details.</p>
<p>That narrow choice is deliberate: the meaningful decision on this ring is which two names meet in the center.</p>`,

  'star-map-necklace': `
<p>The Star Map Necklace records the sky above one exact place and moment—not a decorative constellation chosen from a stock image. Enter the date, local time, and location, and the preview calculates the visible star field for those inputs before it is arranged on the disc pendant.</p>
<p>A wedding evening, a birth, a first meeting, or a memorial date all produce different maps. Even a change in time can shift the sky, which is why the complete moment matters.</p>
<h2>What goes into your map</h2>
<ul>
  <li>The date and local time of the event</li>
  <li>A verified location selected from an exact map pin</li>
  <li>Calculated star positions and constellation lines</li>
  <li>An optional caption and date beneath the circular map</li>
  <li>Silver, gold, or rose-gold finish for the disc</li>
</ul>
<p>The location finder supplies coordinates and timezone information together. If the place is edited afterward, select it again so the calculation is not based on an earlier pin.</p>
<h2>Disc and finish choices</h2>
<p>The current pendant is a disc offered in silver, gold, and rose-gold finishes. The circular face gives the chart a natural horizon and keeps the caption separate from the stars. Use a brief caption—such as a name, place, or a few words tied to the event—so it remains readable. Before checkout, change the time once and confirm the preview changes with it, then restore the intended moment and review the final date, place, and wording together.</p>`,

  'complete-coordinates-set': `
<p>The Complete Coordinates Set carries one location across three different forms: a flat-band ring, an open cuff bracelet, and a vertical bar necklace. It is made for someone who wants a coordinated group rather than three unrelated pieces chosen separately.</p>
<p>Choose gold or silver, select the ring size, and enter the core coordinate pair once. The set preview then shows how that location is distributed across the ring, bracelet, and necklace.</p>
<h2>Three pieces included</h2>
<ul>
  <li>One 4 mm coordinates flat-band ring in sizes 5 through 10</li>
  <li>One adjustable coordinates cuff bracelet</li>
  <li>One four-sided vertical bar coordinates necklace</li>
</ul>
<p>The necklace uses its narrow surfaces differently from the ring and cuff: latitude can sit on the front, longitude on the back, with two additional sides available for short supporting lines.</p>
<h2>Keep the story consistent—or separate it deliberately</h2>
<p>Start by verifying the primary map pin. If every piece should mark the same place, leave the shared engraving mode in place and review each rendering. If the pieces should represent different locations, open the separate customization fields and label them carefully.</p>
<p>Confirm the ring size as well as every engraving line in the cart; changing the color or size should never be treated as a substitute for checking the personalized text.</p>`,

  'coordinates-bracelet-necklace-set': `
<p>This coordinates bracelet and necklace set tells the same place in two visual languages. The cuff keeps the full coordinate line open across the wrist, while the vertical bar necklace divides the details over its narrow sides.</p>
<p>Choose gold, silver, rose gold, or black for both pieces. Enter the shared location once, then use the set preview to compare how the engraving will be arranged on each item.</p>
<h2>Inside the two-piece set</h2>
<ul>
  <li>One adjustable coordinates cuff bracelet</li>
  <li>One four-sided vertical bar coordinates necklace</li>
  <li>Latitude and longitude engraving on both pieces</li>
  <li>Two additional necklace sides for optional short text</li>
  <li>One shared preview for comparing the two finished layouts</li>
</ul>
<p>The extra necklace surfaces are useful for a date, two initials, or a short place name. They do not need to repeat the coordinates already shown on the first two sides.</p>
<h2>Build the pair around a real location</h2>
<p>Use a map pin for the ceremony entrance rather than the city, the trailhead rather than the entire park, or the first apartment rather than a broad ZIP code. Paste the final coordinates back into a map before ordering.</p>
<p>If the bracelet and necklace are intended for two different people, decide whether both should share the same place or whether the separate-piece fields better represent the relationship. Review both pieces in the cart as distinct engravings before checkout.</p>`,

  'personalized-chain-link-bracelet': `
<p>The Personalized Chain Link Coordinates Bracelet puts the engraving on a center plate framed by substantial links. It has more visual weight than a slim cuff, while the coordinate line still reads as a private reference rather than a nameplate.</p>
<p>Choose gold, black, silver, or rose gold, then enter the latitude and longitude of the place you want on the plate. The adjustable lobster-clasp closure lets the bracelet sit closer or looser on the wrist.</p>
<h2>Built around the center plate</h2>
<ul>
  <li>One custom coordinate engraving up to 30 characters</li>
  <li>Stainless-steel chain-link construction</li>
  <li>Adjustable lobster-clasp closure</li>
</ul>
<p>The broader links make this bracelet easy to wear by itself. The engraving remains concentrated in one place instead of wrapping around the entire chain.</p>
<h2>Get the location right before the style decision</h2>
<p>Begin with the map pin, not the finish. Confirm that the coordinate pair returns to the intended building, beach access, stadium gate, or other exact spot. Then choose the color that fits the wearer’s usual watch, rings, or necklace. Keep the engraving to the location itself; if the story needs a date or explanation, add it to a handwritten note rather than crowding the center plate.</p>`,

  'coordinates-flat-band-ring': `
<p>The Coordinates Flat Band Ring keeps a meaningful location in the rhythm of an everyday band. The engraving follows the ring’s clean outer surface, so the numbers are visible without adding a separate stone, charm, or raised setting.</p>
<p>Choose a 4 mm or 6 mm width, then select silver, gold, or rose gold and a whole US size from 5 through 10. The narrower band is quieter; the wider version gives the coordinate line more presence.</p>
<h2>Ring choices that change the result</h2>
<ul>
  <li>4 mm or 6 mm flat-band width</li>
  <li>Silver, gold, or rose-gold finish</li>
  <li>Whole sizes 5, 6, 7, 8, 9, and 10</li>
  <li>One coordinate or short-text engraving up to 30 characters</li>
  <li>A flat outer profile without a raised setting</li>
</ul>
<p>The band can sit alone, mark a commitment without imitating a traditional wedding ring, or join an existing stack. Measure the intended finger rather than borrowing a size from a different hand.</p>
<h2>Use the available engraving space carefully</h2>
<p>A compact decimal coordinate pair is easier to read than a long place name. Verify the map result, keep necessary direction letters or minus signs, and remove spacing that does not help legibility.</p>
<p>After choosing width and size, recheck the preview because the same text can feel different on 4 mm and 6 mm bands. The cart should show the final engraving and selected ring configuration together.</p>`,

  'coordinates-keychain': `
<p>The Coordinates Keychain is for a meaningful place that belongs with the objects carried every day. It can mark the first house on a new set of keys, a hometown on a travel bag, or the starting point of a road trip without asking the recipient to wear jewelry.</p>
<p>The rectangular tag is paired with a split ring and offered in silver, gold, and rose-gold finishes. Its front face holds one coordinate line or another short engraving up to 30 characters.</p>
<h2>A practical format for one precise place</h2>
<ul>
  <li>Rectangular engraved tag with a split-ring attachment</li>
  <li>Silver, gold, and rose-gold finish choices</li>
  <li>One required personalization line</li>
</ul>
<p>The flat tag makes the numbers easy to read at a glance, while the coordinate format keeps the location unobtrusive.</p>
<h2>Choose coordinates with the recipient in mind</h2>
<p>For a new homeowner, use the front entrance or a nearby landmark if the exact address should remain private. For a graduate, use the campus building connected to the strongest memory rather than the center of the city.</p>
<p>Paste the finished coordinate string into a map, check every direction letter and symbol, then review the selected finish and engraving together in the cart.</p>`,

  'magnetic-couples-bracelet-set': `
<p>This magnetic bracelet set is less about matching jewelry and more about the small moment when the two center pieces meet. Each person wears one adjustable cord bracelet; bring the pair together and the magnetic halves connect with a click.</p>
<p>The design is not engraved or personalized. Its meaning comes from who receives the second bracelet, whether that is a partner, close friend, sibling, parent, or child.</p>
<h2>What arrives in the set</h2>
<ul>
  <li>Two matching cord bracelets</li>
  <li>One magnetic connector on each bracelet</li>
  <li>Adjustable sizing for independent fits</li>
  <li>A gift-ready box for presenting the pair together</li>
</ul>
<p>Red, blue, white, black, silver, grey, multicolor, rose gold, green, and pink variants are currently listed. Choose the color for the people wearing it rather than treating the pair as strictly romantic.</p>
<h2>Made for two separate wrists</h2>
<p>Loosen each cord before putting it on, adjust it to the individual wrist, and keep the magnetic center facing outward. The connection is a symbolic detail, not a permanent clasp—the bracelets remain separate during normal wear. This set works especially well for a move, deployment, first semester away, long-distance relationship, or any friendship where a useful reminder matters more than a formal piece of jewelry.</p>`
};

const seoDescriptions = {
  'leather-coordinate-bracelet': 'Engrave four six-character lines across three steel plates on an adjustable leather bracelet in white, brown, or black.',
  'coordinates-bracelet': 'Mark one meaningful place on an adjustable coordinates cuff with a verified latitude and longitude engraving in four color choices.',
  'coordinates-necklace': 'Personalize one to four sides of a vertical coordinates necklace with a location, date, names, or another concise engraving.',
  'matching-coordinates-necklaces': 'Create two matching coordinates necklaces with one shared location or separate engravings for each vertical bar pendant.',
  'custom-birthstone-rings': 'Personalize a two-name birthstone-style ring with separate engraving fields that preserve the spelling and order of both names.',
  'star-map-necklace': 'Calculate and engrave the night sky for an exact date, local time, and map location on a silver, gold, or rose-gold disc.',
  'complete-coordinates-set': 'Coordinate a flat-band ring, adjustable cuff, and four-sided bar necklace around one verified location or separate places.',
  'coordinates-bracelet-necklace-set': 'Pair an adjustable coordinates cuff with a four-sided bar necklace, each arranged around the meaningful place you choose.',
  'personalized-chain-link-bracelet': 'Engrave a meaningful latitude and longitude on the center plate of an adjustable chain-link bracelet in four color choices.',
  'coordinates-flat-band-ring': 'Engrave a verified location on a 4 mm or 6 mm flat-band coordinates ring, available in three finishes and whole sizes 5–10.',
  'coordinates-keychain': 'Carry one verified location on a rectangular coordinates keychain with a split-ring attachment and three finish choices.',
  'magnetic-couples-bracelet-set': 'Share two adjustable cord bracelets whose magnetic center pieces connect when brought together, with ten listed color choices.'
};

const expectedOptions = {
  'leather-coordinate-bracelet': ['White', 'Brown', 'Black'],
  'coordinates-bracelet': ['Gold', 'Silver', 'Rose gold', 'Black'],
  'coordinates-necklace': ['Black', 'Silver', 'Rose gold', 'Gold', '1 side', '2 sides', '3 sides', '4 sides'],
  'matching-coordinates-necklaces': ['Gold', 'Rose Gold', 'Silver', 'Black', '1 side', '2 sides', '3 sides', '4 sides'],
  'custom-birthstone-rings': ['Default Title'],
  'star-map-necklace': ['Silver', 'Gold', 'Rose gold', 'Disc Pendant'],
  'complete-coordinates-set': ['Gold', 'Silver', '5', '6', '7', '8', '9', '10'],
  'coordinates-bracelet-necklace-set': ['Gold', 'Silver', 'Rose gold', 'Black'],
  'personalized-chain-link-bracelet': ['Gold', 'Black', 'Silver', 'Rose Gold'],
  'coordinates-flat-band-ring': ['Silver', 'Gold', 'Rose gold', '4mm', '6mm', '5', '6', '7', '8', '9', '10'],
  'coordinates-keychain': ['Silver', 'Gold', 'Rose gold'],
  'magnetic-couples-bracelet-set': ['Red', 'Blue', 'White', 'Black', 'Silver', 'Grey', 'Multicolor', 'Rose gold', 'Green', 'Pink']
};

const products = Object.entries(descriptions).map(([handle, descriptionHtml]) => {
  const original = byHandle.get(handle);
  if (!original) throw new Error(`Snapshot is missing ${handle}`);
  if (original.status !== 'ACTIVE') throw new Error(`${handle} is not active`);
  if (!original.variants.nodes.some((variant) => variant.availableForSale)) throw new Error(`${handle} has no available variant`);
  const optionValues = new Set(original.options.flatMap((option) => option.optionValues.map((value) => value.name)));
  for (const expected of expectedOptions[handle]) {
    if (!optionValues.has(expected)) throw new Error(`${handle} is missing expected option value: ${expected}`);
  }

  const update = {
    handle,
    expectedUpdatedAt: original.updatedAt,
    expectedContentFingerprint: productContentFingerprint(original),
    seoTitle: original.seo.title || original.title,
    seoDescription: seoDescriptions[handle],
    descriptionHtml: descriptionHtml.trim()
  };
  const validation = validateProductDescriptionUpdate(update);
  if (validation.errors.length) throw new Error(`${handle}: ${validation.errors.join('; ')}`);
  return update;
});

const batchErrors = validateDescriptionBatch(products);
if (batchErrors.length) throw new Error(batchErrors.join('; '));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ sourceSnapshot: snapshotPath, preparedAt: new Date().toISOString(), products }, null, 2)}\n`);
console.log(`Prepared ${products.length} product description updates at ${outputPath}`);
