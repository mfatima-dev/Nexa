// Storefront imagery. Nexa has no product photography yet, so every active product is mapped to its
// own licensed photo in PRODUCT_IMAGE_OVERRIDES, curated to match that product's name/category with no
// third-party logos or recognizable branded products in frame. `getProductImage` resolves a product id
// straight to its photo, so the same product always shows the same photo and no two products share one.
// CATEGORY_PHOTOS now only backs `getCategoryImage` (the four Home-page category cards) and the rare
// fallback for a product without an override. To bring in real photography later: replace a photo id
// below — nothing else in the storefront needs to change, since every page calls these functions rather
// than holding a URL itself.

function unsplash(photoId, width) {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&q=80&auto=format&fit=crop`
}

const CATEGORY_PHOTOS = {
  Bags: ['1622560480605-d83c853bc5c3', '1544816155-12df9643f363'],
  Travel: ['1581553680321-4fffae59fccd', '1516738901171-8eb4fc13bd20'],
  Accessories: ['1602143407151-7111542de6e8'],
  Tech: ['1618384887929-16ec33fab9ef'],
}
const FALLBACK_CATEGORY = 'Bags'

// One product id -> one specific, distinct photo. Every active product (p01-p20) has its own entry so
// the same image is never reused across products; p09 (Packing Cubes Set) is the one exception — no
// clean, unbranded, free-tier photo of an actual packing-cube set could be sourced, so it still falls
// back to its category pool below until a real photo is available.
const PRODUCT_IMAGE_OVERRIDES = {
  p01: '1591534577302-1696205bb2bc', // Urban Backpack — grey canvas backpack on a bed
  p02: '1758398332771-0a79c5df74a3', // Travel Organizer — cream leather organizer pouch
  p03: '1525103504173-8dc1582c7430', // Leather Weekender — brown leather weekend bag
  p04: '1602143407151-7111542de6e8', // City Bottle
  p05: '1544816155-12df9643f363', // Everyday Tote
  p06: '1780744929328-e4c3f152821d', // Passport Wallet — mustard fabric travel document wallet
  p07: '1696451355859-cfdcedea4bc7', // Tech Organizer — black hard-shell zip case
  p08: '1473188588951-666fce8e7c68', // Commuter Messenger Bag — leather satchel with buckles
  p10: '1657603571233-5e9860e96d00', // Laptop Sleeve 14" — black leather sleeve
  p11: '1448582649076-3981753123b5', // Canvas Duffel — tan canvas duffel bag
  p12: '1741417657803-f49d647abce4', // Minimalist Cardholder — slim burgundy leather cardholder
  p13: '1589687010219-85904f2f11b3', // Travel Pillow — grey inflatable neck pillow
  p14: '1591290619618-904f6dd935e3', // Wireless Charging Pad — white circular charging pad
  p15: '1667411424594-403300e5cc35', // Crossbody Sling Bag — black single-strap sling
  p16: '1724093830883-4c08c8469dd5', // Luggage Tag Set — blank tag on a suitcase handle
  p17: '1657603334984-65dff4699d76', // Cable Organizer Pouch — small black leather zip pouch
  p18: '1787074657878-f03844be1025', // Insulated Lunch Bag — woven cooler bag, reflective lining
  p19: '1581553680321-4fffae59fccd', // Rolling Carry-On
  p20: '1741417658026-a73782595c2c', // Key Pouch — small leather key pouch with ring
}

// Stable, cheap string hash (not cryptographic) so a product always lands on the same pool index.
function hashString(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = (Math.imul(hash, 31) + value.charCodeAt(index)) >>> 0
  return hash
}

function photoIdFor(product) {
  if (PRODUCT_IMAGE_OVERRIDES[product.id]) return PRODUCT_IMAGE_OVERRIDES[product.id]
  const pool = CATEGORY_PHOTOS[product.category] ?? CATEGORY_PHOTOS[FALLBACK_CATEGORY]
  return pool[hashString(product.id) % pool.length]
}

/** The card-sized storefront image for one product. */
export function getProductImage(product, width = 900) {
  return unsplash(photoIdFor(product), width)
}

/** A larger crop of the same photo, for the product detail page. */
export function getProductDetailImage(product, width = 1600) {
  return unsplash(photoIdFor(product), width)
}

/** The lead photo for a catalog category (collection cards). */
export function getCategoryImage(category, width = 900) {
  const pool = CATEGORY_PHOTOS[category] ?? CATEGORY_PHOTOS[FALLBACK_CATEGORY]
  return unsplash(pool[0], width)
}

export function heroImage(width = 2000) {
  return unsplash('1483985988355-763728e1935b', width)
}

export const EDITORIAL_IMAGES = {
  // Boutique interior — used behind the About/brand-story section.
  storefront: (width = 1600) => unsplash('1441986300917-64674bd600d8', width),
  // Lifestyle portrait — used alongside the About copy.
  portrait: (width = 1000) => unsplash('1517841905240-472988babdf9', width),
}
