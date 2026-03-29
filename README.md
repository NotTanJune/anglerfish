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
anglerfish/
├── api/
│   ├── _lib/
│   │   ├── fallback.ts              # Pre-cached demo data
│   │   └── taxonomy.ts             # Dark pattern taxonomy + OpenAI schema
│   ├── scan.ts                      # TinyFish scraping endpoint
│   └── classify.ts                  # OpenAI classification endpoint
├── public/
│   └── assets/
│       ├── sprites/                 # Pixel art monster sprites (14 total)
│       ├── creatures/               # FBX sea creature models + textures
│       ├── waterNormal1.png         # Ocean normal maps
│       ├── waterNormal2.png
│       └── Meshy_AI_Abyssal_Angler*.glb  # 3D anglerfish boss model
├── src/
│   ├── App.tsx                      # Main app with scan flow
│   ├── main.tsx                     # React entry point
│   ├── index.css                    # Global styles + CSS variables
│   ├── scene/
│   │   └── OceanBackground.tsx      # Three.js ocean, sky, creatures, anglerfish
│   ├── components/
│   │   ├── DescentPage.tsx          # Scroll UI, cards, depth meter, report
│   │   ├── LoadingScreen.tsx        # Asset preloader
│   │   ├── ScanningOverlay.tsx      # Scan progress animation
│   │   ├── ThreatReport.tsx         # End screen report card
│   │   ├── URLInput.tsx             # Landing page URL input
│   │   └── HUD/
│   │       ├── DepthMeter.tsx       # Depth gauge sidebar
│   │       ├── ManipulationScore.tsx
│   │       └── PatternTicker.tsx
│   ├── config/
│   │   ├── depthZones.ts            # Ocean depth zone definitions
│   │   ├── fallbackData.ts          # Client-side demo data
│   │   ├── monsters.ts             # Monster config per pattern type
│   │   ├── spriteMap.ts            # Pattern type to sprite file mapping
│   │   └── taxonomy.ts            # 13-category dark pattern taxonomy
│   ├── services/
│   │   └── api.ts                   # Backend API client
│   ├── shaders/
│   │   ├── settings.ts             # GLSL shader chunk registration
│   │   ├── oceanShaders.ts         # Water surface + volume shaders
│   │   └── skyboxShader.ts         # Procedural skybox shaders
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   └── utils/
│       └── random.ts               # Seeded PRNG for procedural generation
├── index.html                       # Entry HTML with SEO meta tags
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json                      # Vercel deployment config
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

## Safety Grading

The safety score (0-100) measures how safe a site is from dark patterns. Higher is better.

The score is calculated as `100 - manipulation`, where manipulation is a weighted average of:

- **Intensity (60%)**: average pattern severity weighted by confidence, normalized against a max severity of 5
- **Breadth (40%)**: number of distinct dark patterns found, where 10+ patterns = maximum breadth penalty

| Grade | Safety Score | Meaning |
|-------|-------------|---------|
| A | 80-100 | Minimal manipulation |
| B | 60-79 | Some dark patterns present |
| C | 40-59 | Notable manipulation tactics |
| D | 20-39 | Heavy use of dark patterns |
| F | 0-19 | Pervasive manipulation |

A site with no dark patterns scores 100 (grade A). A site with many severe patterns scores near 0 (grade F).

## Credits

- **Anglerfish 3D Model**: ["Anglerfish"](https://skfb.ly/pGLKo) by Petr Janecka, licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- **Sea Creatures Pack**: SeaCreaturesPack (FBX models + textures)

## License

MIT
