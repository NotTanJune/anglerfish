import type { PatternType } from '../types'

export interface TaxonomyEntry {
  name: string
  description: string
  example: string
  emoji: string
}

export const TAXONOMY: Record<PatternType, TaxonomyEntry> = {
  urgency: {
    name: 'Urgency',
    description: 'Creating artificial time pressure to force quick decisions',
    example: '"Only 2 hours left!" countdown timers',
    emoji: '\u{1F4A3}',
  },
  scarcity: {
    name: 'Scarcity',
    description: 'Claiming limited availability to pressure purchases',
    example: '"Only 3 left in stock"',
    emoji: '\u{1F480}',
  },
  misdirection: {
    name: 'Misdirection',
    description: 'Drawing attention to one thing to distract from another',
    example: 'Highlighted "Accept All" vs tiny "Manage"',
    emoji: '\u{1F3B0}',
  },
  forced_action: {
    name: 'Forced Action',
    description: 'Requiring users to do something unrelated to proceed',
    example: '"Create account to continue"',
    emoji: '\u{1F6A7}',
  },
  social_proof: {
    name: 'Social Proof',
    description: 'Using fake or misleading social validation',
    example: '"847 people viewing this"',
    emoji: '\u{1F47B}',
  },
  sneaking: {
    name: 'Sneaking',
    description: 'Hiding information or adding items without consent',
    example: 'Pre-checked newsletter signup',
    emoji: '\u{1F50D}',
  },
  obstruction: {
    name: 'Obstruction',
    description: 'Making an action unnecessarily difficult',
    example: '12-step unsubscribe flow',
    emoji: '\u{1F512}',
  },
  confirmshaming: {
    name: 'Confirmshaming',
    description: 'Guilt-tripping users into accepting something',
    example: '"No thanks, I don\'t like saving money"',
    emoji: '\u{1F622}',
  },
  disguised_ads: {
    name: 'Disguised Ads',
    description: 'Ads styled to look like navigation or content',
    example: 'Native ads styled as editorial content',
    emoji: '\u{1F3AD}',
  },
  nagging: {
    name: 'Nagging',
    description: 'Repeatedly asking for something the user has declined',
    example: 'Repeated notification permission popups',
    emoji: '\u{1F987}',
  },
  trick_questions: {
    name: 'Trick Questions',
    description: 'Using confusing language to mislead user choices',
    example: '"Uncheck to not opt out"',
    emoji: '\u{2753}',
  },
  hidden_costs: {
    name: 'Hidden Costs',
    description: 'Revealing additional charges late in the process',
    example: 'Fees revealed only at checkout',
    emoji: '\u{1F4B8}',
  },
  bait_and_switch: {
    name: 'Bait & Switch',
    description: 'Advertising one thing but delivering another',
    example: 'Free tier that forces upgrade',
    emoji: '\u{1F41F}',
  },
}
