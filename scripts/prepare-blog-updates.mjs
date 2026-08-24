import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [snapshotArgument, outputArgument = '.blog-admin-work/updates.json'] = process.argv.slice(2);

if (!snapshotArgument) {
  throw new Error('Usage: node scripts/prepare-blog-updates.mjs <snapshot.json> [output.json]');
}

const snapshotPath = resolve(snapshotArgument);
const outputPath = resolve(outputArgument);
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const byHandle = new Map(snapshot.articles.map((article) => [article.handle, article]));

const SHOP_LINK = '/collections/all';
const ORDER_LINK = '/blogs/travel-tips/how-to-order';
const COORDINATES_GUIDE = '/blogs/ourcoordinates-journal/how-to-find-gps-coordinates-for-your-jewelry-the-complete-guide';
const seoTitleOverrides = {
  'summer-travel-coordinates-jewelry-2026': 'Summer Travel Jewelry: A Meaningful Keepsake',
  'wedding-season-2026-coordinates-jewelry-gift-guide': 'Coordinates Jewelry Gifts for Weddings',
  'tips-young-solo-travel': 'Solo Travel Tips for First-Time Travelers',
  '5-tips-for-travel-on-budget': 'How to Travel on a Realistic Budget',
  'everything-you-need-to-start-your-travel-blog': 'How to Start a Travel Journal That Lasts',
  '10-unpopular-destinations-you-need-to-visit': '10 Overlooked Travel Ideas Worth Planning',
  'ultimate-tulum-travel-guide-eat-sleep-shop-party': 'Tulum Travel Guide: Plan a Flexible Trip'
};

const section = (heading, content) => `<h2>${heading}</h2>\n${content.trim()}`;
const paragraphs = (...items) => items.map((item) => `<p>${item}</p>`).join('\n');
const list = (...items) => `<ul>\n${items.map((item) => `<li>${item}</li>`).join('\n')}\n</ul>`;
const articleBody = (intro, ...sections) => `${paragraphs(...intro)}\n${sections.join('\n')}`;
const removeBodyH1 = (body) => body.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '').trim();
const promoteH3 = (body) => body.replace(/<h3\b/gi, '<h2').replace(/<\/h3>/gi, '</h2>');
const removeEmptyHeadings = (body) => body.replace(/<h[2-6]\b[^>]*>\s*(?:&nbsp;)?\s*<\/h[2-6]>/gi, '');
const append = (body, content) => `${removeEmptyHeadings(removeBodyH1(body))}\n${content.trim()}`;

const rewrites = {
  'summer-travel-coordinates-jewelry-2026': {
    title: 'Summer Travel Jewelry: Turn a Trip Into a Keepsake',
    summary: 'Choose meaningful coordinates from a summer trip and turn them into personalized jewelry with this practical planning and gifting guide.',
    body: articleBody(
      [
        'The best travel souvenirs do more than prove where you went. They bring back the feeling of arriving, finding a favorite view, or sharing a place with someone you love. Coordinates jewelry turns one exact location into an understated keepsake you can wear long after the bags are unpacked.',
        'A thoughtful piece starts with the story, not the product. Before choosing a necklace or bracelet, decide which moment from the trip deserves to be remembered and who will wear it. That small amount of planning makes the finished engraving feel personal instead of generic.'
      ],
      section('Choose the place before the coordinates', paragraphs(
        'Start by naming the moment in ordinary words: the beach where your family met every morning, the overlook where you proposed, the first apartment after a cross-country move, or the café that became your daily ritual. Once the story is clear, finding the exact latitude and longitude is much easier.',
        `Drop a pin on the precise spot and compare it with the surrounding map before copying the numbers. Our <a href="${COORDINATES_GUIDE}">complete guide to finding GPS coordinates</a> explains how to check a location on common map tools and avoid selecting a nearby road or business by mistake.`,
        'If the place is private, consider using the town center, a nearby landmark, or fewer decimal places. The engraving can still represent the memory without displaying an exact home address.'
      )),
      section('Four summer memories worth engraving', `${list(
        '<strong>A first independent trip.</strong> Mark the hotel, trailhead, station, or city center that represents the confidence of going somewhere new.',
        '<strong>A family tradition.</strong> Use the cabin, campground, beach access, or hometown that brings everyone back together.',
        '<strong>A relationship milestone.</strong> Choose the proposal spot, destination wedding venue, honeymoon stop, or first shared vacation.',
        '<strong>A new beginning.</strong> Remember a graduation trip, relocation, deployment homecoming, or the place a long-distance chapter ended.'
      )}${paragraphs('The most famous landmark is not always the most meaningful choice. A quiet corner that only the recipient recognizes can make a stronger gift because the story belongs to them.')}`),
      section('Match the piece to everyday style', paragraphs(
        `Look at what the recipient already wears. A simple pendant works well for someone who layers necklaces, while a cuff or leather bracelet may suit someone who prefers a piece that stays close to the wrist. Browse the <a href="${SHOP_LINK}">personalized jewelry collection</a> with their usual metal color, clothing, and daily routine in mind.`,
        'Keep the engraving readable and visually balanced. Coordinate formats vary in length, so check the product instructions before ordering. If a design includes an optional message, let the coordinates carry the location and use the extra space for a date, initials, or a few words that explain why it matters.'
      )),
      section('Turn the gift into a complete story', paragraphs(
        'Write down the meaning of the location before you place the order. That sentence can become the note inside the gift: “the overlook where we decided to move,” “our first family trip,” or “the place you proved you could do it.” The explanation makes the reveal immediate even if the numbers are a surprise.',
        'For a future trip, confirm the location before departure and save the map pin. For a trip that already happened, compare photos, receipts, and shared location history so the engraving points to the right place. Ask a travel companion discreetly if you need a second opinion.'
      )),
      section('Order with time for personalization', paragraphs(
        `Personalized pieces need more planning than an off-the-shelf souvenir. Review the product page, enter the engraving exactly as you want it produced, and double-check spelling, symbols, and coordinate direction. The <a href="${ORDER_LINK}">OurCoordinates ordering guide</a> walks through the process step by step.`,
        'Order early enough to allow for production and delivery, especially before a birthday, anniversary, graduation, or departure date. When the piece arrives, check the engraving against your saved pin before wrapping it.'
      )),
      section('A souvenir made for the days after the trip', paragraphs(
        'Photos preserve what a place looked like. Coordinates preserve where the story happened. By choosing the location carefully, matching the design to the wearer, and explaining the memory in a few honest words, you create a summer keepsake that still feels relevant in every season.',
        'Save the original map pin, coordinate format, and a short description with your travel photos. That record will help if you order another matching piece later, and it preserves the meaning for family members who may not know the location by sight.'
      ))
    )
  },
  'wedding-season-2026-coordinates-jewelry-gift-guide': {
    title: 'Coordinates Jewelry Gifts for Weddings and Anniversaries',
    summary: 'Find meaningful coordinates jewelry ideas for couples, wedding parties, anniversaries, and destination celebrations without guessing at the details.',
    body: articleBody(
      [
        'Wedding gifts become memorable when they point back to a real part of the couple’s story. Coordinates jewelry can mark the ceremony venue, the place they met, a proposal spot, or the home they are building together without putting the entire message on display.',
        'The key is accuracy and restraint. Choose one location with a clear emotional meaning, confirm the pin, and select a piece the recipient will genuinely wear. This guide helps couples, guests, and wedding-party members make those decisions with confidence.'
      ],
      section('Which wedding location should you engrave?', `${paragraphs('Begin with the relationship milestone the gift is meant to celebrate. The venue is an intuitive choice for a wedding-day gift, but it is only one option.')}${list(
        '<strong>Where they met:</strong> ideal for an engagement, shower, or anniversary gift that honors the beginning.',
        '<strong>The proposal location:</strong> a private reference with an instantly recognizable story.',
        '<strong>The ceremony venue:</strong> a natural choice for the couple, parents, or wedding party.',
        '<strong>The honeymoon or elopement destination:</strong> useful when travel is central to the celebration.',
        '<strong>The first shared home:</strong> a meaningful alternative for couples whose everyday life matters more than a formal venue.'
      )}${paragraphs('If you are not certain which location the couple would choose, ask someone close to them. A verified answer is better than a dramatic surprise built around the wrong pin.')}`),
      section('Confirm the coordinates carefully', paragraphs(
        `Search the location, zoom in, and drop the pin on the exact entrance, ceremony area, overlook, or building that matters. Then compare the address and map context. Follow our <a href="${COORDINATES_GUIDE}">guide to finding coordinates</a> if you need help choosing a format.`,
        'Outdoor venues and large resorts can cover a wide area, so do not assume the first search result represents the ceremony location. For a private residence, use a nearby landmark or reduced precision if the couple would prefer not to display an exact address.'
      )),
      section('Gift ideas for each person in the celebration', paragraphs(
        `For a partner, select the style and metal they already wear and let the location carry most of the meaning. A parent or grandparent may appreciate the ceremony coordinates with the date. Members of the wedding party can receive matching pieces tied to the venue, while still choosing individual finishes from the <a href="${SHOP_LINK}">personalized jewelry collection</a>.`,
        'Avoid adding every possible detail. Coordinates plus a date or initials usually feel more timeless than a long message. If the piece has multiple engraving areas, establish a hierarchy: location first, then the small supporting detail.'
      )),
      section('Destination weddings and elopements', paragraphs(
        'Travel celebrations create several possible pins: the ceremony setting, the town where everyone stayed, or the view that defined the trip. Choose the one that will still make sense years later. A restaurant or tour stop may close, while the beach, city, island, or landmark remains easy to recognize.',
        'Build extra time into the order if the jewelry will be presented before departure. Personalized items require careful review, and shipping dates can vary. If the event is close, consider presenting a written description of the planned gift and ordering only after the exact location is confirmed.'
      )),
      section('How to present the gift', paragraphs(
        'Include one sentence explaining the location. A note such as “where our next chapter began” gives the numbers context without overexplaining. If the recipient already knows the coordinates, invite them to guess before revealing the answer.',
        `Enter the engraving exactly as it should appear and review the product-specific character limits before checkout. See <a href="${ORDER_LINK}">how to order personalized coordinates jewelry</a> for the full process. We often try to provide visual confirmation during production, but it should not be treated as a guaranteed pre-shipping step, so the details submitted with the order must be correct.`
      )),
      section('A wedding keepsake that belongs to the couple', paragraphs(
        'A strong personalized gift does not need to announce itself. It needs an accurate location, a wearable design, and a story the recipient values. When those pieces align, coordinates jewelry becomes a quiet reminder of the people and place behind the celebration.',
        'Keep a copy of the confirmed pin and the wording submitted with the order. Couples can use the same reference for a future anniversary gift, vow renewal, or family keepsake without having to reconstruct the details years later. The record is especially useful when a venue has several entrances or ceremony spaces.'
      ))
    )
  },
  'best-long-distance-relationship-gifts-summer-2026': {
    title: 'Meaningful Long-Distance Relationship Gifts',
    summary: 'Choose a useful, personal long-distance relationship gift that reflects your shared routines, next visit, and the places that connect you.',
    body: articleBody(
      [
        'A long-distance gift works best when it supports the relationship you already have. It can create a shared ritual, make the next visit feel closer, or hold a private reference to the place where your story began. The price matters less than whether the gift feels specific to the two of you.',
        'Instead of searching for one universally “best” gift, start with the recipient’s habits and the kind of connection you want to strengthen. A practical object for daily life, an experience you can share remotely, and a personalized keepsake each solve a different need.'
      ],
      section('Start with the moment, not the merchandise', paragraphs(
        'Think about the details your partner mentions repeatedly: the coffee shop from your first weekend, the airport where you always meet, the halfway city, or the first home you plan to share. Those references give a gift emotional weight without requiring a long explanation.',
        'Also consider timing. A countdown gift makes sense before a visit, while a comfort-focused package may be better during a demanding season at work or school. If travel dates are uncertain, avoid printing a date that could become stressful and center the gift on a location or phrase that will remain true.'
      )),
      section('Gift ideas that create a shared routine', `${list(
        '<strong>A planned at-home date:</strong> send the same meal ingredients, movie rental, game, or playlist and set a time to enjoy it together.',
        '<strong>A visit journal:</strong> keep tickets, notes, maps, and one favorite photo from each trip in a book you trade back and forth.',
        '<strong>Two useful everyday items:</strong> matching mugs, key organizers, or travel cases can feel connected without looking overly formal.',
        '<strong>A future experience:</strong> plan one specific activity for the next visit and include a flexible alternative in case logistics change.'
      )}${paragraphs('The routine is the real gift. Put the next video date on the calendar, write the first journal entry, or include instructions for when to open each part of the package.')}`),
      section('Use coordinates to connect two places', paragraphs(
        `Coordinates jewelry can represent where you met, where one partner lives, or the place you plan to reunite. Choose a necklace or bracelet from the <a href="${SHOP_LINK}">personalized jewelry collection</a> based on what your partner already wears, not only what looks romantic in a gift photo.`,
        `Verify the pin before ordering. Our <a href="${COORDINATES_GUIDE}">coordinates guide</a> shows how to check the location and format the latitude and longitude. For a home address, you can use the city center or a nearby landmark if either partner prefers more privacy.`,
        'Matching pieces do not have to be identical. The same coordinates on two different styles can feel more personal because each person receives something suited to them.'
      )),
      section('Make the message honest and specific', paragraphs(
        'Skip a generic paragraph copied from a gift guide. Write one or two sentences about what the location means and what you are looking forward to. “This is where I knew the distance was worth it” carries more meaning than a broad promise about forever.',
        'If the relationship is new, keep the gesture proportionate. A favorite snack, a handwritten note, and a planned call may feel warmer than an expensive object. If you have been together for years, a durable keepsake tied to a shared milestone may fit the history you have built.'
      )),
      section('Plan for shipping and the next visit', paragraphs(
        'Confirm the recipient’s current address and building instructions without spoiling the entire surprise. International shipments and campus mailrooms can add uncertainty, so send early and keep the package description accurate for customs.',
        `For personalized jewelry, double-check every character at checkout and follow the <a href="${ORDER_LINK}">ordering guide</a>. Production communication can vary, so the submitted engraving details—not an expected preview—should be treated as the final source of truth.`
      )),
      section('The best gift says “I know you”', paragraphs(
        'Distance makes attention more valuable. Choose something that reflects your partner’s real taste, anchors a shared memory, and gives you a small way to connect after the package arrives. That combination will outlast a trend and make the gift part of the relationship rather than a substitute for it.',
        'Once the gift is opened, build a moment around it: schedule the call, share the map pin, and tell the story you attached to the location. The conversation is what turns a thoughtful object into a shared memory.'
      ))
    )
  },
  '7-places-you-must-travel-before-you-die': {
    title: '7 Meaningful Trips to Add to Your Travel List',
    summary: 'Build a more personal travel list with seven types of meaningful trips, from family roots and nature escapes to creative and cultural journeys.',
    body: articleBody(
      [
        'A travel list should reflect your curiosity, budget, mobility, and season of life—not someone else’s definition of a “must-see” destination. The most memorable journey may be an international adventure, but it could also be a nearby city you have postponed visiting or the hometown that shaped your family.',
        'These seven trip ideas are intentionally flexible. Use them as prompts to choose a place that matters to you, then research current costs, entry rules, accessibility, weather, and official travel guidance before booking.'
      ],
      section('1. A trip connected to your family story', paragraphs(
        'Visit the town where a parent grew up, the neighborhood where your grandparents lived, or a region tied to a family tradition. Ask relatives for addresses, recipes, names, and stories before you go so the itinerary includes more than landmarks.',
        'Respect privacy and local context when visiting former homes or small communities. Public archives, museums, cemeteries, libraries, and community history organizations can help you learn without intruding.'
      )),
      section('2. A landscape unlike home', paragraphs(
        'Choose a coastline, desert, mountain range, forest, or wide-open plain that changes your sense of scale. The goal is not to collect a dramatic photograph; it is to spend enough time outside to notice how the place works.',
        'Check seasonal hazards and choose activities that match your experience. Reserve guided support when needed, carry the right equipment, and leave room in the itinerary for weather changes.'
      )),
      section('3. A city best explored slowly', paragraphs(
        'Pick a walkable neighborhood and stay long enough to develop a small routine. Visit a market, use public transit, return to the same café, and plan only one major attraction per day. Slower travel can reveal everyday details that disappear on a checklist-heavy visit.',
        'Learn basic local etiquette and useful phrases. Choose locally owned businesses when practical, and be considerate when photographing residents, homes, ceremonies, or working spaces.'
      )),
      section('4. A journey built around food', paragraphs(
        'Travel for a regional dish, harvest, cooking tradition, or family recipe. Markets, food tours, farm visits, and cooking classes can connect the meal to the people and landscape behind it.',
        'Research dietary needs in advance and keep expectations flexible. The most meaningful meal may be a simple specialty served in its everyday setting rather than a famous reservation.'
      )),
      section('5. A creative or learning retreat', paragraphs(
        'Plan a trip around photography, writing, music, craft, language, or another skill you want to practice. A workshop provides structure, while unplanned time gives you space to respond to the place.',
        'You do not need to produce a polished project. A sketchbook, field notes, or a small set of photographs can become a personal record of how the trip changed your attention.'
      )),
      section('6. A nearby place you keep overlooking', paragraphs(
        'Look within a few hours of home for a museum, historic district, park, shoreline, or small town you have never explored. Shorter trips are easier to repeat and can deliver more rest because they require less transit and planning.',
        'Treat the day with the same care you would give a major vacation: research one local story, make a thoughtful meal stop, and put your phone away for part of the visit.'
      )),
      section('7. A return to a place that changed you', paragraphs(
        'Revisit a destination from childhood, a first trip together, or a turning point in your life. Some details will have changed, and that contrast is part of the experience. Avoid trying to recreate every moment exactly.',
        'Bring an old photo or note, then make room for a new tradition. The return can honor who you were while acknowledging what has happened since.'
      )),
      section('Turn a travel list into a real plan', paragraphs(
        'Choose one idea and write down the purpose, possible dates, realistic budget, and information you still need. Check official destination and travel-advisory sources close to departure because conditions change. Build an alternative plan for weather, closures, or personal circumstances.',
        `When a journey becomes part of your story, save the exact location in your map app. You can later use our <a href="${COORDINATES_GUIDE}">guide to finding coordinates</a> or browse <a href="${SHOP_LINK}">personalized coordinates jewelry</a> to turn the place into a wearable reminder. The value is not in completing all seven ideas; it is in choosing one that feels genuinely yours.`,
        'Revisit the list each year instead of treating it as a race. Your health, finances, relationships, and interests will change, and the right trip should change with them.'
      ))
    )
  },
  'how-to-order': {
    title: 'How to Order Personalized Coordinates Jewelry',
    summary: 'Follow a clear, step-by-step process to choose a piece, verify GPS coordinates, enter engraving details, and review your personalized order.',
    body: articleBody(
      [
        'Ordering personalized jewelry should feel meaningful, not confusing. The most important work happens before checkout: choose the right piece, confirm the exact location, and enter every character the way you want it engraved.',
        'This guide explains the full OurCoordinates ordering process. Product options and character limits can vary, so always use the instructions shown on the specific product page as the final reference.'
      ],
      section('1. Choose a piece that fits the wearer', paragraphs(
        `Start with the <a href="${SHOP_LINK}">personalized jewelry collection</a> and consider what the recipient already wears. Notice their preferred metal color, necklace length, bracelet style, and whether they choose minimal or statement pieces.`,
        'Read the complete product description before personalizing. Confirm available colors, sizing, engraving areas, and the number of characters allowed in each field. If a design has multiple lines, decide what belongs on each line before typing.'
      )),
      section('2. Decide which place tells the story', paragraphs(
        'Write the location in ordinary language first. It might be where you met, a wedding venue, a family home, a favorite trail, or a city that represents a new beginning. If several places matter, choose the one the recipient will recognize most quickly.',
        'For a private residence, consider using a nearby public landmark, the city center, or a less precise coordinate format. Personal meaning does not require displaying an exact address.'
      )),
      section('3. Find and verify the coordinates', paragraphs(
        `Use a trusted map tool, zoom in, and drop the pin on the exact spot. Copy the latitude and longitude, including direction letters or negative signs where required. Follow our <a href="${COORDINATES_GUIDE}">complete coordinates guide</a> for detailed instructions.`,
        'Then verify the result a second time. Paste the coordinates back into a map search and confirm that the pin returns to the intended location. Look at nearby streets, buildings, and landmarks rather than relying only on the displayed place name.'
      )),
      section('4. Format the engraving for the product', paragraphs(
        'Enter the coordinates in the format requested on the product page. Do not add labels, punctuation, dates, or symbols unless the field instructions allow them. Spaces and direction letters may count toward a character limit.',
        'If the product has an engraving preview, use it to review placement and balance. The preview is a helpful representation, while the product instructions and the text you submit remain the controlling order details.'
      )),
      section('5. Add an optional message with restraint', paragraphs(
        'A date, initials, or a short phrase can support the location when the design includes another engraving area. Keep the message brief enough to remain readable. You can explain the full story in a handwritten note instead of forcing it onto the jewelry.',
        'Copy the message from a plain-text note to avoid accidental smart punctuation or autocorrect changes. Review capitalization and spelling exactly as they appear in the personalization field.'
      )),
      section('6. Review every option before adding to cart', `${paragraphs('Pause and compare the completed form with your source information. Check each item below before continuing:')}${list(
        'Correct product, color, material, and size',
        'Correct latitude and longitude in the requested format',
        'Correct engraving line and character placement',
        'Correct date, initials, spelling, and capitalization',
        'Correct quantity and recipient, especially for matching pieces'
      )}${paragraphs('Personalized orders are produced from the information submitted, so this review is the best way to prevent an avoidable mistake.')}`),
      section('7. Complete checkout and monitor your order', paragraphs(
        'Add the item to cart, confirm the personalization is associated with the correct product, and enter an email address you monitor. Review the delivery address carefully, including apartment or unit details.',
        'Keep the order confirmation and watch for production or shipping communication. We try to share visual confirmation when the workflow allows, but a photo proof before shipping is not guaranteed. Contact support promptly if you notice an error in the submitted information; whether a change is possible depends on the production stage.'
      )),
      section('A final 60-second check', paragraphs(
        'Before placing the order, search the coordinates one last time and read the engraving aloud character by character. Make sure the product style suits the wearer and the delivery window suits the occasion. A careful minute at checkout protects the meaning you want the finished piece to carry.',
        'Save a screenshot of the pin and your final text with the order confirmation. It creates a simple personal record of the place and makes it easier to explain the engraving when the gift is opened.'
      ))
    )
  },
  'art-of-wandering-wander-jewelry': {
    title: 'Travel-Inspired Jewelry and the Art of Wandering',
    summary: 'Explore how travel-inspired jewelry can preserve a meaningful place through coordinates, thoughtful design, and an honest personal story.',
    body: articleBody(
      [
        'Wandering is not valuable because it takes us far from home. It is valuable because it helps us notice. A side street, a familiar shoreline, or a town visited during a difficult transition can become more meaningful than the landmark everyone photographs.',
        'Travel-inspired jewelry gives that attention a physical form. The strongest pieces are not built on a borrowed symbol or an invented history; they begin with a real place and a story the wearer can tell.'
      ],
      section('What makes travel jewelry personal?', paragraphs(
        'A map outline can represent a region, a compass can suggest direction, and a coordinate engraving can identify one exact point. None of those formats is automatically meaningful. The connection comes from why the wearer chose the place.',
        'Before selecting a design, write one sentence about the location. “The beach where our family reunited” is specific. “Somewhere beautiful” is not. That sentence will help you choose the right symbol, engraving, and level of detail.'
      )),
      section('Coordinates as a private map', paragraphs(
        'Latitude and longitude can look abstract to everyone else while remaining instantly recognizable to the person who chose them. They can mark a hometown, a proposal spot, a first solo destination, or the place someone decided to begin again.',
        `Use our <a href="${COORDINATES_GUIDE}">guide to finding GPS coordinates</a> to confirm the pin and decide how much precision is appropriate. For a home or another private location, a nearby landmark or town center may carry the same story with less detail.`
      )),
      section('Choose a design that can join everyday life', paragraphs(
        `The best keepsake is one the recipient wants to wear. Browse the <a href="${SHOP_LINK}">personalized jewelry collection</a> and compare each option with their real wardrobe, existing jewelry, and daily routine. A subtle necklace may suit one person, while another will reach for a leather bracelet or clean metal cuff.`,
        'Match the metal tone to what they already own. Check sizing and product-specific engraving limits. If the piece offers several lines, give each line a purpose instead of filling every available space.'
      )),
      section('Let the place lead the message', paragraphs(
        'Coordinates are strongest when they do not have to carry the entire explanation. Pair the piece with a short note describing what happened there and why you remembered it. A date can help, but a sentence often adds more emotional context.',
        'For your own travel keepsake, write the note while the memory is fresh. Record the sounds, weather, people, or small routine you associate with the location. Those details will matter when the trip is no longer recent.'
      )),
      section('Travel thoughtfully, remember honestly', paragraphs(
        'A destination is someone else’s home. Learn local expectations, support community businesses when practical, and ask before photographing people or private spaces. Avoid turning a culture, sacred symbol, or neighborhood into decoration without understanding its meaning.',
        'An exact coordinate is often a more honest souvenir because it describes your relationship to a place rather than claiming the place itself. The engraving says where your memory happened; your story explains what it meant.'
      )),
      section('Build a small archive around the piece', paragraphs(
        'Save the map pin with a few photographs, the date, and a paragraph about what happened there. A jewelry piece may be worn for years, while names, routes, and businesses around the location can change. The archive protects the context behind the numbers.',
        'If the keepsake is a gift, include a copy of that story in the card and keep another with your photos. If the recipient prefers a private meaning, let them decide how much to share when someone asks about the engraving.'
      )),
      section('From wandering to a wearable memory', paragraphs(
        `Once you have the location and design, review <a href="${ORDER_LINK}">how to order coordinates jewelry</a>. Verify the pin, enter the engraving exactly as requested, and save your map reference. The finished piece can then become a quiet prompt to stay curious, return when you can, and keep noticing the places that shape you.`,
        'Travel memories do not need to be grand to deserve that care. A day trip, first apartment, family gathering, or local trail can shape a life as much as a distant destination. Choose the place whose meaning has lasted, not the one most likely to impress someone else.',
        'That choice keeps the design timeless. The coordinates remain visually simple, while the wearer carries the richer meaning and can share it on their own terms.'
      ))
    )
  },
  '10-unpopular-destinations-you-need-to-visit': {
    title: '10 Overlooked Travel Ideas for a More Meaningful Trip',
    summary: 'Skip the rigid bucket list and explore ten thoughtful ways to find less-obvious destinations while checking current safety and local conditions.',
    body: articleBody(
      [
        'The phrase “unpopular destination” can make a place sound empty or undiscovered, even though every destination is a community with its own history and daily life. A better goal is to look beyond the most crowded itinerary and find a trip that fits your interests, budget, and comfort level.',
        'The ideas below are planning prompts rather than claims that a location is secret or always safe. Conditions, entry requirements, transportation, and seasonal risks change. Review official destination information and your government’s current travel advice before booking, then confirm again close to departure.'
      ],
      section('1. Choose a second city', paragraphs(
        'Instead of beginning with a country’s most visited city, research a smaller regional center connected by reliable transportation. University towns, port cities, and provincial capitals often have museums, markets, architecture, and food traditions without the same concentration of visitors.',
        'Compare travel time and accessibility before assuming smaller means easier. Build enough time into the stay to learn one neighborhood rather than rushing through on a day trip.'
      )),
      section('2. Follow a regional craft', paragraphs(
        'Look for a place known for ceramics, weaving, metalwork, printmaking, woodworking, or another living craft. Seek workshops, cooperatives, museums, and studios that explain how the work is made and who benefits from the purchase.',
        'Ask before photographing artisans and do not bargain aggressively over work that took significant time. Check customs rules before buying plant, animal, antique, or culturally protected materials.'
      )),
      section('3. Visit outside the headline season', paragraphs(
        'A shoulder-season trip can offer a different view of a familiar region. Research typical weather, daylight, transportation schedules, and seasonal closures rather than assuming every attraction operates year-round.',
        'Lower crowds do not always mean lower risk or cost. Build a flexible itinerary and choose refundable arrangements when weather may affect the trip.'
      )),
      section('4. Build a journey around a landscape', paragraphs(
        'Choose a wetland, forest, desert, coast, or mountain region and learn how local communities live with that environment. National and regional parks can provide context, but nearby conservation centers, guides, and cultural institutions may reveal more than a single scenic stop.',
        'Use established routes, respect closures, and select activities suited to your skills. Remote landscapes require realistic plans for water, weather, communication, and emergency support.'
      )),
      section('5. Take a rail or ferry route', paragraphs(
        'A journey can be the organizing idea. Regional trains and public ferries connect communities in a way that makes geography visible and reduces the pressure to collect major sights.',
        'Check official schedules and reservation rules. Service may be seasonal or infrequent, so leave margin between connections and keep essential medication and documents with you.'
      )),
      section('6. Learn a family recipe in its wider context', paragraphs(
        'If your family history is connected to a region, explore the food, language, migration, and working life behind a familiar recipe. Public archives, museums, cooking classes, and local historians can offer context without turning a personal search into a claim of belonging.',
        'Talk with relatives before the trip and document uncertainty. Family stories change as they are retold, and the research can be meaningful even when it does not produce one exact address.'
      )),
      section('7. Plan a small museum route', paragraphs(
        'Pick a theme—design, music, maritime history, civil rights, science, or local industry—and connect several smaller institutions. Their collections often explain details that a broad national museum cannot.',
        'Verify opening days directly, since small organizations may operate limited hours. Give each stop enough time and avoid scheduling more than you can absorb.'
      )),
      section('8. Stay near, not inside, the famous place', paragraphs(
        'A nearby town can provide a slower base for visiting a popular landmark, especially when public transit makes the connection practical. This can spread spending and create space for ordinary meals and walks outside the busiest zone.',
        'Do not assume every nearby community wants tourism growth. Follow local rules, keep noise low in residential areas, and use licensed accommodations.'
      )),
      section('9. Return instead of collecting somewhere new', paragraphs(
        'An overlooked trip can be a second visit. Return to a city where you only saw the center, a park you experienced in another season, or a childhood destination you now understand differently.',
        'Revisiting reduces the pressure to see everything. Keep one favorite ritual and add one neighborhood, trail, museum, or conversation you missed the first time.'
      )),
      section('10. Explore close to home with deeper attention', paragraphs(
        'Search your own region for historic districts, public lands, cultural centers, or landscapes you routinely pass. A short trip can be more restorative when it avoids complex transit and leaves room for unplanned time.',
        'Prepare as carefully as you would for a distant journey. Learn whose land and history you are visiting, check access requirements, and support a local restaurant, guide, or institution.'
      )),
      section('A safer, more respectful planning process', paragraphs(
        'Replace viral lists with primary sources. Check official entry requirements, health guidance, weather services, park notices, and travel advisories. A destination that was reasonable when an article was written may not be appropriate now. If official guidance says not to travel, choose another place rather than treating risk as part of the adventure.',
        `Save the exact places that become meaningful during the trip. Our <a href="${COORDINATES_GUIDE}">coordinates guide</a> explains how to verify a map pin, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> offers a way to preserve one carefully chosen location after you return. A better trip is not the rarest pin on the map; it is one planned with curiosity, humility, and current information.`
      ))
    )
  },
  'how-to-fix-an-unhappy-relationship': {
    title: 'How to Repair an Unhappy Relationship Together',
    summary: 'A practical, non-clinical guide to naming relationship problems, rebuilding everyday trust, and recognizing when safety must come first.',
    body: articleBody(
      [
        'An unhappy period does not automatically mean a relationship is over, but it also cannot be repaired by one person doing all the work. Progress usually begins when both partners can describe the problem honestly, listen without punishment, and make small changes that can be observed over time.',
        'This article offers general educational ideas, not therapy or crisis advice. If fear, threats, coercion, stalking, isolation, financial control, or physical or sexual harm is present, the priority is safety—not better communication with the person causing harm.'
      ],
      section('First, separate disconnection from abuse', paragraphs(
        'Ordinary conflict can still be painful, but both people retain the freedom to disagree, seek support, set boundaries, and make choices. Abuse involves a pattern of power and control. A relationship exercise designed for mutual conflict may be unsafe when one partner uses retaliation or intimidation.',
        'If you are unsure, review the National Domestic Violence Hotline’s information on <a href="https://www.thehotline.org/identify-abuse/">recognizing abuse and planning for safety</a>. In the United States, the Hotline offers confidential support by phone, chat, or text. If you are in immediate danger, contact local emergency services. Use a safer device if you think your internet activity is monitored.'
      )),
      section('Name the problem in specific terms', paragraphs(
        '“We are unhappy” is too broad to solve. Each partner can privately write down what has changed, when it tends to happen, and what a better week would look like. Focus on observable patterns such as cancelled time together, unresolved money decisions, unequal household work, criticism, or avoiding affection.',
        'Then choose one issue for the first conversation. Avoid bringing every past disappointment into the same hour. A focused problem makes it easier to identify a realistic next action and notice whether anything improves.'
      )),
      section('Create conditions for a useful conversation', paragraphs(
        'Choose a time when neither person is rushing, intoxicated, exhausted, or responsible for an immediate task. Agree that either person can request a pause if the conversation becomes overwhelming, and decide when you will return to it.',
        'Speak from your own experience: describe the situation, the effect it has on you, and the concrete change you are requesting. The other partner should summarize what they heard before responding. Understanding a concern does not require agreeing with every interpretation.'
      )),
      section('Turn promises into small repeatable actions', paragraphs(
        '“I will be better” cannot be measured. “I will put our weekly check-in on the calendar and arrive without my phone” can. Choose one or two actions each partner can reasonably repeat for several weeks.',
        'Examples include dividing a recurring task, setting a spending threshold that requires discussion, planning protected time together, or changing how a conflict pause works. Keep the experiment small enough to sustain during an ordinary week, not only during a romantic reset.'
      )),
      section('Repair trust with consistency', paragraphs(
        'An apology matters when it names the harm, takes responsibility without excuses, and is followed by changed behavior. The hurt partner is not required to feel reassured immediately. Trust often returns through many predictable moments rather than one dramatic gesture.',
        'Do not use gifts to skip accountability. A keepsake can mark a genuine new chapter after actions have changed, but it cannot repair dishonesty, contempt, or broken agreements by itself.'
      )),
      section('Know when outside support may help', paragraphs(
        'A qualified couples therapist can help with recurring conflict, communication breakdowns, grief, major transitions, or decisions about the future when both partners can participate safely. Individual support may be more appropriate when one person needs privacy, clarity, or help setting boundaries.',
        'Look for a licensed professional whose experience fits the concern and ask how they approach safety, confidentiality, and goals. If abuse is present, seek specialized domestic-violence support before pursuing couples counseling.'
      )),
      section('Review progress honestly', paragraphs(
        'Set a date to review the specific changes you agreed to. Ask what improved, what remained difficult, and whether both people followed through. One imperfect week does not determine the future, but repeated refusal, ridicule, or retaliation is important information.',
        'It is possible to care about someone and decide the relationship is no longer healthy or workable. Staying together is not the only successful outcome; clarity, safety, and respectful decision-making matter too.'
      )),
      section('If you choose to mark a shared turning point', paragraphs(
        `After real repair work, some couples choose a private reminder of the place where they reconnected, made a commitment, or began again. Our <a href="${COORDINATES_GUIDE}">guide to finding meaningful coordinates</a> can help you verify that location, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> offers understated ways to carry it. Let the object represent work already underway rather than asking it to do the work for you.`
      ))
    )
  },
  'ultimate-tulum-travel-guide-eat-sleep-shop-party': {
    title: 'Tulum Travel Guide: Plan a Thoughtful, Flexible Trip',
    summary: 'Plan a Tulum trip with practical guidance on where to stay, transportation, beaches, ruins, cenotes, budgeting, safety, and responsible travel.',
    body: articleBody(
      [
        'Tulum combines Caribbean coastline, Maya history, cenotes, and a fast-growing hospitality scene. It can also be expensive, spread out, and different from the highly edited version seen online. A good trip begins with realistic logistics and enough flexibility to respond to weather, seaweed, transportation, and local conditions.',
        'Business hours, prices, entry rules, and safety guidance can change. Check the current U.S. Department of State information for Mexico, official Mexican and Quintana Roo resources, and the CDC destination page before departure. Confirm every reservation directly rather than relying on an older blog list.'
      ],
      section('Understand Tulum’s main areas', paragraphs(
        'Tulum Pueblo is the inland town, with more everyday services and a wider range of restaurants and lodging. The coastal hotel zone stretches along a narrow road beside the beach and can involve slower, more expensive transportation. The archaeological zone and national park have their own access and mobility considerations.',
        'Choose your base according to the activities you value most. Staying near the beach can simplify early coastal time but raise costs. Staying in town can provide more dining options and a different pace, while requiring a plan for reaching the coast.'
      )),
      section('Choose lodging by location, not only photos', paragraphs(
        'Map the property before booking and read recent guest feedback about power, water, air conditioning, noise, road access, and transportation. A listing described as “Tulum” may be farther from your priority activities than expected.',
        'Ask what is included in the rate and how the property handles late arrival, luggage, weather disruptions, and airport transfers. Use licensed accommodations and keep the address available offline.'
      )),
      section('Plan transportation before arrival', paragraphs(
        'Compare airport transfers, intercity buses, authorized taxis, rental cars, bicycles, and walking based on your route and comfort level. Do not assume a bicycle is suitable for every traveler or every time of day. Heat, traffic, lighting, weather, and road conditions matter.',
        'Confirm prices before entering a taxi, avoid impaired driving, and leave extra time for the coastal road. Keep essential documents and medication with you during transfers.'
      )),
      section('Visit the ruins with context', paragraphs(
        'The Tulum archaeological site is not simply a scenic background. Learn about the site and Maya history from official interpretive materials or a qualified guide. Follow current ticketing, park-entry, and transportation instructions because access systems can change.',
        'Arrive prepared for sun, heat, and limited shade. Respect barriers and posted rules, and avoid climbing or touching protected structures. Give the visit enough time that it does not become only a photo stop.'
      )),
      section('Choose cenotes responsibly', paragraphs(
        'Cenotes vary in access, depth, facilities, water conditions, and management. Select established operators, follow life-jacket and shower rules, and ask whether the experience suits your swimming ability. Never enter a closed or unsupervised site simply because it appears on a map.',
        'Avoid sunscreen or other products when site rules prohibit them, do not touch formations, and keep food and waste away from the water. Confirm current opening information directly.'
      )),
      section('Make a beach plan that can change', paragraphs(
        'Beach access, park rules, currents, weather, and seasonal sargassum can affect the day. Follow lifeguard instructions and warning flags, and do not swim alone. Keep an alternative inland activity ready rather than forcing a beach schedule in unsafe conditions.',
        'Bring sun protection and water, but verify local restrictions on single-use plastics and items permitted in protected areas. Use reef-conscious practices and leave the shore as you found it.'
      )),
      section('Eat and shop with local context', paragraphs(
        'Instead of treating a static restaurant list as current, identify a mix of established local cooking, markets, casual meals, and one planned reservation. Check recent hours and menus directly. Ask your lodging host for nearby options, then compare with current reviews.',
        'When shopping, prioritize work whose maker and materials are clearly identified. Avoid purchasing archaeological artifacts, protected natural materials, or objects presented as “traditional” without credible context. Pay a fair price for skilled work.'
      )),
      section('Build a realistic budget', paragraphs(
        'Separate lodging, transportation, food, activities, taxes, tips, and emergency margin. Coastal prices may differ sharply from town prices, and transportation can add up when the itinerary moves back and forth several times a day.',
        'Carry more than one payment method and use secure cash access. Keep a reserve for changing a transfer, replacing a cancelled activity, or seeking medical care. Review travel and health insurance coverage before departure.'
      )),
      section('Travel with current safety and health information', paragraphs(
        'Monitor official travel advice and destination-specific health guidance. Share your itinerary with someone you trust, protect your passport and valuables, use authorized transportation, and avoid carrying expensive items you do not need. Know how to contact your lodging and local emergency services.',
        'Discuss vaccines, medication, and personal health needs with a qualified clinician before travel. Use safe food and water practices, protect against insects, stay hydrated, and seek medical care when needed.'
      )),
      section('A flexible four-day outline', `${list(
        '<strong>Day one:</strong> arrive, settle into your chosen area, walk nearby in daylight, and have an early local meal.',
        '<strong>Day two:</strong> visit the archaeological site with context, then choose a flexible beach or museum alternative based on conditions.',
        '<strong>Day three:</strong> visit a responsibly managed cenote or take a qualified cultural or nature excursion.',
        '<strong>Day four:</strong> leave time for a market, neighborhood meal, and unhurried departure rather than adding a distant last-minute stop.'
      )}${paragraphs('Treat this as a framework, not a checklist. Fewer well-planned activities often create a better trip than crossing the region repeatedly for photographs.')}`),
      section('Remember the place without reducing it to a trend', paragraphs(
        `Save the location that mattered most—a view, a meal, the ruins, or the base where the trip came together. Our <a href="${COORDINATES_GUIDE}">guide to finding coordinates</a> can help you verify the pin, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> offers a quiet way to remember it. The best souvenir should point back to your experience while respecting that Tulum is a living community, not only a backdrop.`
      ))
    )
  }
};

const transformations = {
  '5-family-travel-spots': (original) => ({
    title: '5 Meaningful Family Travel Ideas for Every Age',
    summary: 'Explore five flexible family trip ideas with practical planning tips for different ages, budgets, energy levels, and shared interests.',
    body: append(promoteH3(original.body), section('Make the destination work for your family', paragraphs(
      'A successful family trip is not defined by how many attractions you complete. Choose one or two priorities for each day, protect time for meals and rest, and involve children or older relatives in selecting an activity. Confirm accessibility, weather, opening times, and reservation rules with official sources before departure.',
      `Save the place that becomes the family favorite, even if it was not the headline attraction. Our <a href="${COORDINATES_GUIDE}">guide to finding coordinates</a> can help you verify the pin, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> offers a way to remember a reunion, first flight, or annual tradition after everyone returns home.`
    )))
  }),
  'tips-young-solo-travel': (original) => ({
    title: 'Solo Travel Tips for Young and First-Time Travelers',
    summary: 'Plan a first solo trip with practical guidance on budgeting, safety, transportation, communication, flexible itineraries, and confidence.',
    body: append(original.body, section('Create a simple safety and communication plan', paragraphs(
      'Share your itinerary and lodging details with someone you trust, agree on a check-in schedule, and keep offline copies of essential contacts and documents. Use official travel advisories and destination information close to departure because conditions can change after you book.',
      'Trust your judgment when a situation feels wrong. Leave, seek a staffed public place, or contact local help rather than worrying about appearing rude. Keep enough money and battery power to change transportation or lodging if needed.'
    )) + section('Keep one location as your personal milestone', paragraphs(
      `Your first solo journey may have one place that represents the whole experience: the station where you arrived, the view you reached, or the café where being alone began to feel comfortable. Save the map pin and use our <a href="${COORDINATES_GUIDE}">coordinates guide</a> to verify it. If you want a wearable reminder later, browse the <a href="${SHOP_LINK}">personalized jewelry collection</a> after the trip rather than making a rushed choice while traveling.`
    )))
  }),
  '5-tips-for-travel-on-budget': (original) => ({
    title: 'How to Travel on a Budget Without Missing the Point',
    summary: 'Use a realistic travel budget, flexible dates, thoughtful lodging, local transportation, and a contingency fund to spend where it matters.',
    body: append(promoteH3(original.body)
      .replace(/<a\b[^>]*americanexpress\.com[^>]*>([\s\S]*?)<\/a>/gi, '$1')
      .replace(/\b2022\b/g, 'today'), section('Budget for the memory, not only the booking', paragraphs(
      'Leave room for one experience that connects you to the place and one contingency expense. A budget that covers only the cheapest possible version of every day can become fragile when transportation changes, weather interrupts a plan, or someone gets sick.',
      `After the trip, save the exact location behind your favorite low-cost moment. Our <a href="${COORDINATES_GUIDE}">coordinates guide</a> explains how to confirm the pin, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> can preserve the story without relying on a generic souvenir.`
    )))
  }),
  '6-tips-safe-travel-abroad': (original) => ({
    title: '6 Practical Ways to Travel Abroad More Safely',
    summary: 'Prepare for international travel with official advisories, document backups, communication plans, health guidance, and flexible logistics.',
    body: append(promoteH3(original.body), section('Check current official information', paragraphs(
      'Travel conditions, entry rules, health notices, and local laws can change. Review official government and destination sources before booking and again near departure. Keep a flexible alternative if weather, civil disruption, or another serious issue affects the original plan.',
      `When you return, save meaningful locations without exposing private information. Our <a href="${COORDINATES_GUIDE}">coordinates guide</a> explains how to choose an appropriate pin, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> can turn it into a discreet travel keepsake.`
    )))
  }),
  'everything-you-need-to-start-your-travel-blog': (original) => ({
    title: 'How to Start a Travel Journal You Will Keep Using',
    summary: 'Start a useful travel journal with a simple format for plans, places, people, sensory details, practical notes, and post-trip reflection.',
    body: append(promoteH3(original.body), section('Add exact places without losing the story', paragraphs(
      `When a location matters, save the map pin beside the written memory. Our <a href="${COORDINATES_GUIDE}">guide to finding coordinates</a> helps you verify the latitude and longitude later, when street names or business listings may have changed.`,
      `The journal should remain the full record; a keepsake is only a prompt. If one place becomes the symbol of the journey, browse the <a href="${SHOP_LINK}">personalized jewelry collection</a> and choose a piece that fits your everyday style rather than treating it as another travel purchase.`
    )))
  }),
  'how-to-find-coordinates-in-2026-the-complete-guide-to-latitude-and-longitude': (original) => ({
    title: 'How to Find GPS Coordinates: A Complete Guide',
    summary: 'Learn how to find, copy, format, and verify latitude and longitude on common map tools before using coordinates for jewelry or travel.',
    body: append(removeBodyH1(original.body), section('Use verified coordinates in a personalized piece', paragraphs(
      `Once the pin returns to the correct location, copy the format required by the product page and save the original map reference. Browse the <a href="${SHOP_LINK}">personalized jewelry collection</a> only after you know the engraving length and privacy level that suit the story.`,
      `For the complete checkout process, including product options and a final character-by-character review, read <a href="${ORDER_LINK}">how to order personalized coordinates jewelry</a>. The text submitted with the order should be treated as the source of truth.`
    )))
  }),
  'ultimate-elopement-checklist': (original) => ({
    title: 'The Complete Elopement Planning Checklist',
    summary: 'Plan a meaningful elopement with a practical checklist for legal details, budget, vendors, travel, safety, ceremony plans, and memories.',
    body: append(removeBodyH1(original.body), section('Save the ceremony location accurately', paragraphs(
      `After the ceremony, confirm the exact map pin while the details are fresh. Our <a href="${COORDINATES_GUIDE}">coordinates guide</a> can help you verify the location, and the <a href="${SHOP_LINK}">personalized jewelry collection</a> offers understated keepsakes for the couple or witnesses.`,
      'Choose the ceremony coordinates, nearby landmark, or town center according to your privacy preferences. Keep the full story in your vows, photographs, and notes; the engraving only needs to point back to it.'
    )))
  })
};

const articles = snapshot.articles.map((original) => {
  const prepared = rewrites[original.handle] || transformations[original.handle]?.(original);
  if (!prepared) throw new Error(`No rewrite prepared for ${original.handle}`);
  return {
    handle: original.handle,
    expectedUpdatedAt: original.updatedAt,
    title: prepared.title,
    seoTitle: seoTitleOverrides[original.handle] || prepared.title,
    summary: prepared.summary,
    body: prepared.body,
    tags: original.tags
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ sourceSnapshot: snapshotPath, preparedAt: new Date().toISOString(), articles }, null, 2)}\n`);
console.log(`Prepared ${articles.length} article updates at ${outputPath}`);
