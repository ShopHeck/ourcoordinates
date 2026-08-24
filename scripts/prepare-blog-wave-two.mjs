import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [snapshotArgument, outputArgument = '.blog-admin-work/wave-two-updates.json'] = process.argv.slice(2);
if (!snapshotArgument) throw new Error('Usage: node scripts/prepare-blog-wave-two.mjs <snapshot.json> [output.json]');

const snapshotPath = resolve(snapshotArgument);
const outputPath = resolve(outputArgument);
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const auditCachePath = resolve('.blog-audit-cache/article-results.json');
const auditCache = existsSync(auditCachePath)
  ? JSON.parse(await readFile(auditCachePath, 'utf8'))
  : {};
const auditByHandle = new Map(Object.values(auditCache).map((result) => [result.slug, result]));

const titleOverrides = {
  'coordinates-bracelets-a-fun-way-to-commemorate-your-travels-in-2026': 'Coordinates Bracelets for Meaningful Travel Memories',
  'ultimate-guide-to-best-nightlife-reykjavik-iceland': 'Reykjavik Nightlife Guide: Food, Bars, and Clubs',
  'sterling-silver-vs-gold-plated-coordinates-jewelry': 'Sterling Silver vs Gold-Plated Coordinates Jewelry',
  '15-best-personalized-gifts-for-long-distance-relationships-in-2026': '15 Personalized Gifts for Long-Distance Couples',
  'best-anniversary-gifts-for-her-2026-why-coordinates-jewelry-wins-every-time': 'Meaningful Anniversary Gifts for Her in 2026',
  'best-personalized-gifts-for-long-distance-relationships-2026-gift-guide': 'Personalized Gifts for Long-Distance Relationships',
  'coordinates-necklace-vs-coordinates-bracelet-which-one-to-choose': 'Coordinates Necklace vs Bracelet: How to Choose',
  'meaningful-graduation-gifts-2026-coordinates-jewelry-for-the-next-chapter': 'Meaningful Graduation Gifts with Coordinates',
  'how-to-care-for-your-personalized-jewelry-gold-silver-rose-gold': 'How to Care for Personalized Jewelry',
  'long-distance-relationship-gifts-how-coordinates-jewelry-keeps-you-connected': 'How Coordinates Jewelry Connects Long-Distance Couples',
  'matching-couples-jewelry-2026-the-complete-guide-to-coordinates-sets': 'Matching Couples Jewelry: Coordinates Sets Guide',
  'mothers-day-gift-guide-2026-personalized-jewelry-shell-treasure': "Mother's Day Gift Guide: Personalized Jewelry",
  'why-coordinates-jewelry-is-fastest-growing-gift-trend': 'Why Coordinates Jewelry Makes a Meaningful Gift'
};

const summaryOverrides = {
  'how-to-take-the-perfect-paw-print-for-custom-jewelry': 'Learn how to capture a clear paw print for custom pet jewelry using simple ink, clay, or photo methods without stressing your pet.',
  '6-must-know-tips-before-traveling-to-tibet': 'Plan a Tibet trip with practical guidance on required permits, altitude preparation, cultural respect, packing, and current official advisories.',
  'exploring-amazing-beach-fronts-of-cuba': 'Plan a Cuba beach trip with practical guidance on coastal areas, local context, changing conditions, and current travel and health information.',
  'find-the-best-rental-car-deal': 'Compare rental car prices, fees, insurance choices, fuel policies, and pickup details to build a realistic transportation budget for your trip.',
  'travel-hacking-finding-the-best-travel-reward': 'Learn a cautious framework for comparing changing airline and hotel reward programs, earning rules, redemption value, fees, and travel goals.',
  'why-coordinates-jewelry-is-fastest-growing-gift-trend': 'Learn why coordinates jewelry can make a meaningful personalized gift by connecting an understated engraving to a real place and shared story.'
};

const weakHeadingHandles = new Set([
  'travel-sweden',
  '10-tips-for-every-novice-traveler',
  '4-occasions-to-gift-coordinates-jewelry',
  '6-must-know-tips-before-traveling-to-tibet',
  'absolute-best-beaches-to-visit-california',
  'ultimate-guide-to-best-nightlife-reykjavik-iceland',
  'exploring-amazing-beach-fronts-of-cuba'
]);

const cleanTitle = (value) => value.replace(/\s*\|\s*OurCoordinates\s*$/i, '').trim();
const stripBodyH1 = (body) => body.replace(/<h1\b([^>]*)>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');
const promoteH3 = (body) => body.replace(/<h3\b/gi, '<h2').replace(/<\/h3>/gi, '</h2>');
const paragraphs = (...items) => items.map((item) => `<p>${item}</p>`).join('\n');
const section = (heading, content) => `<h2>${heading}</h2>\n${content}`;
const escapeAttribute = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function addMissingImageAlts(body, title) {
  let imageIndex = 0;
  return body.replace(/<img\b[^>]*>/gi, (tag) => {
    imageIndex += 1;
    if (/\balt=["'][^"']+["']/i.test(tag)) return tag;
    const alt = escapeAttribute(`${title} example ${imageIndex}`);
    if (/\balt=["']["']/i.test(tag)) return tag.replace(/\balt=["']["']/i, `alt="${alt}"`);
    return tag.replace(/<img\b/i, `<img alt="${alt}"`);
  });
}

function relatedGuide(handle) {
  if (/paw-print|pet-memorial|pet-friendly/.test(handle)) {
    return handle === 'how-to-take-the-perfect-paw-print-for-custom-jewelry'
      ? ['/blogs/ourcoordinates-journal/12-most-meaningful-pet-memorial-gifts-for-2026', 'Explore thoughtful ways to preserve a pet’s memory']
      : ['/blogs/ourcoordinates-journal/how-to-take-the-perfect-paw-print-for-custom-jewelry', 'Learn how to capture a clear paw print for custom jewelry'];
  }
  if (/memorial|someone-youve-lost/.test(handle)) {
    return handle === 'thoughtful-memorial-gifts-to-honor-someone-youve-lost'
      ? ['/blogs/travel-tips/memorial-jewelry-2026-how-to-honor-a-loved-one-with-coordinates', 'Read the guide to memorial coordinates jewelry']
      : ['/blogs/travel-tips/thoughtful-memorial-gifts-to-honor-someone-youve-lost', 'Explore thoughtful memorial gift ideas'];
  }
  if (/mothers-day/.test(handle)) {
    return handle === 'mothers-day-gift-ideas-mom-will-wear-every-day'
      ? ['/blogs/travel-tips/mothers-day-gift-guide-2026-personalized-jewelry-shell-treasure', "Read the personalized Mother's Day jewelry guide"]
      : ['/blogs/travel-tips/mothers-day-gift-ideas-mom-will-wear-every-day', 'See jewelry gift ideas designed for everyday wear'];
  }
  if (/graduation/.test(handle)) {
    return handle === 'graduation-gift-ideas-that-arent-cash-in-a-card'
      ? ['/blogs/travel-tips/meaningful-graduation-gifts-2026-coordinates-jewelry-for-the-next-chapter', 'Explore meaningful coordinates gifts for graduates']
      : ['/blogs/travel-tips/graduation-gift-ideas-that-arent-cash-in-a-card', 'See graduation gifts that go beyond cash'];
  }
  if (/valentine|anniversary|girlfriend|romantic|top-travel-for-couples/.test(handle)) {
    return handle === '15-gifts-for-valentines-day'
      ? ['/blogs/travel-tips/unique-valentines-day-gifts-shell-actually-want-2026', "Explore more personal Valentine's Day gift ideas"]
      : ['/blogs/travel-tips/15-gifts-for-valentines-day', 'Compare more meaningful romantic gift ideas'];
  }
  if (/long-distance|relatiionships|matching-couples|military-spouse/.test(handle)) {
    return ['/blogs/ourcoordinates-journal/best-long-distance-relationship-gifts-summer-2026', 'Read the practical long-distance relationship gift guide'];
  }
  if (/silver|gold-plated|jewelry-care|care-for-your/.test(handle)) {
    return handle === 'how-to-care-for-your-personalized-jewelry-gold-silver-rose-gold'
      ? ['/blogs/travel-tips/gold-plated-vs-sterling-silver-jewelry-which-is-right-for-you', 'Compare gold-plated and sterling silver jewelry']
      : ['/blogs/travel-tips/how-to-care-for-your-personalized-jewelry-gold-silver-rose-gold', 'Review the personalized jewelry care guide'];
  }
  if (/sweden|traveler|travel|tibet|beaches|reykjavik|cuba|california|rental-car|virginia/.test(handle)) {
    return ['/blogs/travel-tips/5-tips-for-travel-on-budget', 'Continue with a practical guide to planning a realistic travel budget'];
  }
  if (/gps|coordinates|engraving|coordinate-jewelry|coordinates-jewelry|coordinates-necklace|coordinates-bracelet/.test(handle)) {
    return handle === 'how-to-find-gps-coordinates-for-your-jewelry-the-complete-guide'
      ? ['/blogs/travel-tips/what-do-gps-coordinates-mean-simple-explanation', 'Learn how to read and understand GPS coordinates']
      : ['/blogs/ourcoordinates-journal/how-to-find-gps-coordinates-for-your-jewelry-the-complete-guide', 'Learn how to find and verify coordinates for jewelry'];
  }
  return ['/blogs/ourcoordinates-journal/coordinates-jewelry-the-ultimate-gift-guide-for-every-occasion', 'Explore the complete coordinates jewelry gift guide'];
}

function appendRelatedGuide(body, handle) {
  if (/href=["'][^"']*\/blogs\//i.test(body)) return body;
  const [url, label] = relatedGuide(handle);
  return `${body}\n${section('Continue with a related guide', paragraphs(
    `A useful next step is to <a href="${url}">${label.toLowerCase()}</a>. It adds practical context without repeating the same advice, so you can compare options and make a more informed choice.`
  ))}`;
}

const expansions = {
  'travel-sweden': `${section('Plan the Icehotel portion of the trip', paragraphs(
    'The Icehotel is in Jukkasjärvi in northern Sweden, so the stay should be planned around transportation and season rather than treated like a quick stop in Stockholm. Decide whether the temporary winter hotel, the year-round ice experience, or a warm-room stay best fits your comfort and schedule.',
    'Use the Icehotel’s current <a href="https://www.icehotel.com/plan-your-trip">first-party planning guide</a> to confirm what is operating, how sleeping in a cold room works, and which clothing is recommended. Opening times, prices, transfers, and seasonal experiences can change, so verify them directly before booking.'
  ))}\n${section('Pack for transitions between cold and warm spaces', paragraphs(
    'Build a simple layer system: a moisture-managing base, insulating middle layer, and weather-resistant outer layer, plus warm socks, gloves, and head protection. The property provides specific equipment for some overnight experiences, but travelers should confirm inclusions rather than assuming every item is supplied.',
    'Keep medication, batteries, and electronics protected from extreme cold, and allow time to adjust when moving between outdoor conditions and heated interiors. A flexible itinerary is more useful than overbooking every hour of an Arctic visit.',
    'Save offline copies of reservations, transfer details, and the property address. Build a weather buffer around important connections, carry essential items in hand luggage, and confirm travel insurance coverage for the activities you plan to do. Share the working itinerary with someone at home, keep local emergency contacts accessible, and review the route again on arrival before setting out.'
  ))}`,
  'top-3-couples-necklaces-for-valentines-day-2026': section('Choose a necklace they will actually wear', paragraphs(
    'Start with the recipient’s everyday jewelry: metal color, chain length, pendant size, and whether they usually layer pieces. A romantic idea only becomes a good gift when the design fits their real style and routine.',
    'For matching necklaces, the two pieces do not need to be identical. The same coordinates or message can connect different finishes and chain lengths. Confirm every personalization field and character limit before checkout, and include a short note explaining why the location matters.',
    'Order with enough time for personalization and delivery. Save the confirmed map pin and final engraving text with the order confirmation so both pieces can be checked against the same source. That final review protects the meaning of the gift.'
  )),
  'coordinates-bracelets-a-fun-way-to-commemorate-your-travels-in-2026': `${section('Choose one travel moment to represent the trip', paragraphs(
    'A bracelet is more meaningful when the location is specific. Save the pin for the cabin where everyone gathered, the trailhead that began a first solo hike, the town where a family tradition started, or the overlook tied to a major decision.',
    'Verify the latitude and longitude by pasting the coordinates back into a map search. If the place is a private home, use a nearby landmark or reduced precision when that feels more appropriate.'
  ))}\n${section('Match the bracelet to everyday use', paragraphs(
    'Consider wrist size, material, closure, and the activities the wearer does most often. A minimal cuff, chain bracelet, or leather style can carry the same story while serving different preferences.',
    'Keep the engraving readable and within the product-specific limits. Save the original map pin and submitted text with the order confirmation so the story remains clear years later.',
    'Pair the bracelet with a brief written note that names the place and why it mattered. The engraving can remain visually simple because the note carries the fuller story behind the coordinates. If the bracelet is a gift, let the recipient discover the numbers first, then use the card to reveal the location and memory.'
  ))}`,
  'how-to-take-the-perfect-paw-print-for-custom-jewelry': section('Keep the session calm and brief', paragraphs(
    'Choose a familiar space and prepare every material before bringing your pet over. Work in short attempts, reward cooperation, and stop if the animal becomes uncomfortable. A slightly imperfect print can still preserve the shape and character of the paw.',
    'Photograph the clearest result in even light, keep the camera parallel to the print, and avoid heavy filters. Save the original high-resolution image in case a different crop or contrast adjustment is needed later.'
  )),
  'the-heartfelt-meaning-behind-coordinates-jewelry': section('Meaning comes from the story behind the numbers', paragraphs(
    'Coordinates are not personal on their own. Their value comes from the place they identify and the memory the wearer connects to it: a first home, reunion, proposal, hometown, or turning point.',
    'Write one sentence describing that connection before choosing the design. It will help you select the right location, level of precision, and optional date or message without overcrowding the engraving.'
  )),
  '6-must-know-tips-before-traveling-to-tibet': section('Check current permits, advisories, and altitude guidance', paragraphs(
    'Entry rules and local restrictions can change. The U.S. Department of State’s <a href="https://travel.state.gov/en/international-travel/travel-advisories/china.html">current China travel information</a> says tourist travel to the Tibet Autonomous Region requires a special permit in addition to a Chinese visa and notes that restrictions may be imposed on short notice.',
    'Many destinations in the region are at high altitude. Review the CDC’s <a href="https://wwwnc.cdc.gov/travel/page/travel-to-high-altitudes">high-altitude travel guidance</a> and discuss personal medical concerns with a qualified clinician before departure. This article is general planning information, not medical advice.'
  )),
  'exploring-amazing-beach-fronts-of-cuba': section('Check current travel and health information', paragraphs(
    'Entry rules, transportation, services, and local conditions can change. Review the current U.S. Department of State travel advisory and official destination information before booking, then confirm again close to departure.',
    'The CDC maintains a current <a href="https://wwwnc.cdc.gov/travel/destinations/traveler/none/Cuba">Cuba traveler health page</a> covering destination-specific notices and preparation. Use official sources instead of assuming an older beach recommendation is still accessible or appropriate.'
  ))
};

const articles = snapshot.articles.map((original) => {
  const title = cleanTitle(titleOverrides[original.handle] || original.title);
  const auditDescription = auditByHandle.get(original.handle)?.description || '';
  const summary = summaryOverrides[original.handle] || auditDescription || original.summary || '';
  let body = stripBodyH1(original.body);
  if (weakHeadingHandles.has(original.handle)) body = promoteH3(body);
  if (expansions[original.handle]) body = `${body}\n${expansions[original.handle]}`;
  body = addMissingImageAlts(body, title);
  body = appendRelatedGuide(body, original.handle);
  body = body
    .replace(/fastest[- ]growing/gi, 'increasingly familiar')
    .replace(/millions of people/gi, 'many people')
    .replace(/guaranteed photo proof/gi, 'photo proof when available');

  return {
    handle: original.handle,
    expectedUpdatedAt: original.updatedAt,
    title,
    seoTitle: title,
    summary,
    body,
    tags: original.tags
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ sourceSnapshot: snapshotPath, preparedAt: new Date().toISOString(), articles }, null, 2)}\n`);
console.log(`Prepared ${articles.length} wave-two article updates at ${outputPath}`);
