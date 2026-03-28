export const DARK_PATTERN_TAXONOMY = `
DARK PATTERN TAXONOMY (13 categories):

1. URGENCY - Creating artificial time pressure to force quick decisions.
   Examples: countdown timers, "offer expires in X hours", "sale ends tonight"

2. SCARCITY - Claiming limited availability to pressure purchases.
   Examples: "only 3 left in stock", "limited availability", "selling fast"

3. MISDIRECTION - Drawing attention to one thing to distract from another.
   Examples: highlighted "Accept All" vs tiny "Manage Preferences", large "Subscribe" vs small "No thanks"

4. FORCED_ACTION - Requiring users to do something unrelated to proceed.
   Examples: "create account to continue", mandatory newsletter signup, forced app download

5. SOCIAL_PROOF - Using fake or misleading social validation.
   Examples: "847 people viewing this", "John from NYC just purchased", fake review counts

6. SNEAKING - Hiding information or adding items without consent.
   Examples: pre-checked newsletter signup, auto-added insurance, hidden subscription enrollment

7. OBSTRUCTION - Making an action (especially cancellation) unnecessarily difficult.
   Examples: 12-step unsubscribe flow, hidden cancel button, requiring phone call to cancel

8. CONFIRMSHAMING - Guilt-tripping users into accepting something.
   Examples: "No thanks, I don't like saving money", "I'll pay full price", "I don't want to be smart"

9. DISGUISED_ADS - Ads styled to look like navigation or content.
   Examples: native ads styled as articles, sponsored results that look like organic, download buttons that are ads

10. NAGGING - Repeatedly asking for something the user has declined.
    Examples: repeated notification permission popups, persistent upgrade prompts, recurring cookie banners

11. TRICK_QUESTIONS - Using confusing language to mislead user choices.
    Examples: "Uncheck to not opt out", double negatives in consent forms, confusing toggle states

12. HIDDEN_COSTS - Revealing additional charges late in the process.
    Examples: shipping fees at checkout, service charges added at payment, taxes shown only on final screen

13. BAIT_AND_SWITCH - Advertising one thing but delivering another.
    Examples: "free trial" that requires credit card, advertised price different from actual, feature available only on higher tier
`

export const CLASSIFICATION_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'classify_dark_patterns',
      description: 'Classify dark patterns found on a webpage',
      parameters: {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pattern_type: {
                  type: 'string',
                  enum: [
                    'urgency', 'scarcity', 'misdirection', 'forced_action',
                    'social_proof', 'sneaking', 'obstruction', 'confirmshaming',
                    'disguised_ads', 'nagging', 'trick_questions',
                    'hidden_costs', 'bait_and_switch',
                  ],
                },
                severity: { type: 'integer', minimum: 1, maximum: 5 },
                source_text: { type: 'string', description: 'The exact text or element from the page' },
                page_section: { type: 'string', description: 'Where on the page this was found' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['pattern_type', 'severity', 'source_text', 'page_section', 'confidence'],
            },
          },
        },
        required: ['patterns'],
      },
    },
  },
]
