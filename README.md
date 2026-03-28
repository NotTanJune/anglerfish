# ANGLERFISH

**An autonomous web agent that scrapes any URL, classifies every dark pattern, and renders the results as a cinematic deep-sea descent through the website's manipulative layers.**

> On the internet, the pretty light is always bait.

## What It Does

Enter any URL. ANGLERFISH deploys a web agent (TinyFish) to autonomously navigate and scrape the site, then uses OpenAI GPT-4o to classify every dark pattern and manipulation tactic found. The results are visualized as an interactive scroll-driven descent through a realistic 3D ocean, where each dark pattern appears as a creature encounter at increasing depths, with the most severe patterns lurking in the deepest, darkest waters.

## Features

- **Realistic 3D Ocean** with Three.js Water and Sky shaders, underwater fog, caustic lighting, and animated sea creatures (FBX models)
- **Scroll-driven Descent** inspired by [neal.fun/deep-sea](https://neal.fun/deep-sea/) with smooth camera interpolation
- **13 Dark Pattern Categories** mapped to pixel art monsters (Ticking Bomb, Scarcity Skeleton, Mimic Chest, Ghost Horde, and more)
- **AI Classification** via OpenAI GPT-4o function calling with structured output
- **Web Scraping** via TinyFish API with stealth browser profiles
- **Depth Zones**: Sunlight, Twilight, Midnight, and The Abyss, with progressive visual darkening
- **Boss Encounter**: The Anglerfish awaits at the bottom with a 3D GLB model
- **Threat Assessment**: Split-screen report with grade (A-F), manipulation score, and pattern breakdown

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| 3D Rendering | Three.js (Water, Sky, FBXLoader, GLTFLoader) |
| Animation | Framer Motion |
| Web Agent | TinyFish API (SSE streaming) |
| LLM | OpenAI GPT-4o (function calling) |
| Backend | Vercel Serverless Functions |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- yarn
- TinyFish API key (from hackathon credits)
- OpenAI API key (from hackathon credits)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/anglerfish.git
cd anglerfish
yarn install
cp .env.example .env
# Add your API keys to .env
```

### Development

```bash
# Frontend only (API calls will fail with error message)
yarn dev

# Full stack with API routes
vercel dev
```

### Build

```bash
yarn build
```

## Environment Variables

```
TINYFISH_API_KEY=your_tinyfish_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Project Structure

```
src/
  App.tsx                    # Main app with scan flow
  scene/
    OceanBackground.tsx      # Three.js ocean, sky, creatures, anglerfish
  components/
    DescentPage.tsx           # Scroll UI, cards, depth meter, report
    LoadingScreen.tsx         # Asset preloader
  config/
    fallbackData.ts           # Demo data for testing
    spriteMap.ts              # Pixel art sprite mapping
    monsters.ts               # Monster config per pattern type
    taxonomy.ts               # Dark pattern taxonomy
    depthZones.ts             # Ocean depth zones
  services/
    api.ts                    # API client
api/
  scan.ts                     # TinyFish scraping endpoint
  classify.ts                 # OpenAI classification endpoint
public/
  assets/
    sprites/                  # Pixel art monster sprites
    creatures/                # FBX sea creature models
    waterNormal1.png          # Ocean normal maps
    waterNormal2.png
```

## Dark Pattern Taxonomy

| Pattern | Monster | Severity Range |
|---------|---------|---------------|
| Urgency | Ticking Bomb | Shallow |
| Scarcity | Scarcity Skeleton | Shallow |
| Social Proof | Ghost Horde | Shallow-Mid |
| Sneaking | Floor Trap | Mid |
| Misdirection | Mimic Chest | Mid |
| Disguised Ads | Shape Shifter | Mid |
| Nagging | Swarm Bats | Mid |
| Confirmshaming | Guilt Ghost | Mid-Deep |
| Forced Action | Wall Trap | Deep |
| Obstruction | Locked Door | Deep |
| Trick Questions | Riddle Sphinx | Deep |
| Hidden Costs | Price Phantom | Deep |
| Bait & Switch | ANGLERFISH | Abyss |

## Hackathon Context

Built for the TinyFish + OpenAI Hackathon at NUS Singapore (March 28, 2026).

- **Track**: "Most Likely to Go Viral (for the Wrong Reasons)" / Black Mirror
- **Team**: Solo (Tanmay)

## License

MIT
