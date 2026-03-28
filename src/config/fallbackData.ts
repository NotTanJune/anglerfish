import type { DarkPattern } from '../types'

const BOOKING: DarkPattern[] = [
  { pattern_type: 'urgency', severity: 4, source_text: 'Only 2 rooms left at this price on our site', page_section: 'Search Results', confidence: 0.95 },
  { pattern_type: 'urgency', severity: 3, source_text: 'Booked 5 times for your dates in the last 24 hours', page_section: 'Property Page', confidence: 0.88 },
  { pattern_type: 'scarcity', severity: 4, source_text: 'In high demand! Only 1 room left on our site!', page_section: 'Search Results', confidence: 0.92 },
  { pattern_type: 'social_proof', severity: 3, source_text: '47 people are looking at this property right now', page_section: 'Property Page', confidence: 0.90 },
  { pattern_type: 'confirmshaming', severity: 3, source_text: 'Are you sure? You could miss out on this price.', page_section: 'Exit Intent Popup', confidence: 0.85 },
  { pattern_type: 'sneaking', severity: 2, source_text: 'Genius loyalty program auto-enrolled at checkout', page_section: 'Checkout', confidence: 0.75 },
  { pattern_type: 'hidden_costs', severity: 3, source_text: '14% taxes and fees revealed at final booking step', page_section: 'Payment Page', confidence: 0.88 },
  { pattern_type: 'nagging', severity: 2, source_text: 'Sign in to unlock Genius discounts (shown 3 times)', page_section: 'Header Banner', confidence: 0.80 },
  { pattern_type: 'misdirection', severity: 3, source_text: 'Large "Book Now" button vs tiny "See other options" link', page_section: 'Property Page', confidence: 0.82 },
  { pattern_type: 'bait_and_switch', severity: 4, source_text: 'Advertised "Free Cancellation" but terms show non-refundable deposit required', page_section: 'Pricing Section', confidence: 0.78 },
]

const AMAZON: DarkPattern[] = [
  { pattern_type: 'urgency', severity: 4, source_text: 'Deal ends in 02:34:17', page_section: 'Lightning Deals', confidence: 0.93 },
  { pattern_type: 'urgency', severity: 3, source_text: 'Order within 3 hrs 22 mins to get it by tomorrow', page_section: 'Product Page', confidence: 0.90 },
  { pattern_type: 'scarcity', severity: 3, source_text: 'Only 3 left in stock - order soon', page_section: 'Product Page', confidence: 0.92 },
  { pattern_type: 'social_proof', severity: 2, source_text: '1,247 bought in past month', page_section: 'Product Page', confidence: 0.85 },
  { pattern_type: 'sneaking', severity: 4, source_text: 'Subscribe & Save auto-enrollment pre-checked', page_section: 'Add to Cart', confidence: 0.90 },
  { pattern_type: 'disguised_ads', severity: 3, source_text: 'Sponsored products blended with organic search results', page_section: 'Search Results', confidence: 0.88 },
  { pattern_type: 'misdirection', severity: 3, source_text: 'Prime signup modal blocking product page with tiny "No thanks" link', page_section: 'Product Page', confidence: 0.85 },
  { pattern_type: 'hidden_costs', severity: 2, source_text: 'Import fees deposit of $12.45 shown only at checkout', page_section: 'Checkout', confidence: 0.80 },
  { pattern_type: 'bait_and_switch', severity: 3, source_text: 'Free shipping advertised but requires $35 minimum or Prime membership', page_section: 'Cart Page', confidence: 0.82 },
]

const GENERIC: DarkPattern[] = [
  { pattern_type: 'misdirection', severity: 4, source_text: 'Enterprise plan visually highlighted as "Most Popular" despite being most expensive', page_section: 'Pricing Table', confidence: 0.90 },
  { pattern_type: 'trick_questions', severity: 3, source_text: 'Annual billing shown by default, monthly price hidden behind toggle', page_section: 'Pricing Toggle', confidence: 0.85 },
  { pattern_type: 'forced_action', severity: 3, source_text: 'Must enter credit card for "free" trial', page_section: 'Signup Form', confidence: 0.92 },
  { pattern_type: 'obstruction', severity: 4, source_text: 'Cancel subscription requires contacting support team via email', page_section: 'Account Settings', confidence: 0.88 },
  { pattern_type: 'confirmshaming', severity: 3, source_text: 'Downgrade button reads "I don\'t need advanced features"', page_section: 'Plan Selection', confidence: 0.82 },
  { pattern_type: 'hidden_costs', severity: 3, source_text: 'API overage charges not mentioned until billing page', page_section: 'Usage Dashboard', confidence: 0.78 },
  { pattern_type: 'bait_and_switch', severity: 5, source_text: '"Unlimited" plan has fair use policy capping at 10,000 requests', page_section: 'Terms of Service', confidence: 0.85 },
]

export function FALLBACK_PATTERNS(url: string): DarkPattern[] {
  const normalized = url.toLowerCase()
  if (normalized.includes('booking')) return BOOKING
  if (normalized.includes('amazon')) return AMAZON
  return GENERIC
}
