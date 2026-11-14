# AI Travel & City Explorer

A full-stack web application that turns a free-text travel request into an optimized multi-day walking itinerary. A language model only interprets the request; the route itself is produced by a deterministic, custom-built **Route Engine** (spatial clustering, route-order optimization and time-aware scheduling) running on real OpenStreetMap data.

> Currently supports **Florence, Italy** (2,544 points of interest imported from OpenStreetMap).

---

## Table of Contents

- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Benchmark](#benchmark)
- [Security](#security)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [AI Usage Disclosure](#ai-usage-disclosure)
- [Data Attribution](#data-attribution)

---

## Key Features

- **Natural-language planning.** Describe a trip ("2 days in Florence, I love art, don't want to walk much, coffee after lunch") and get structured parameters.
- **Custom Route Engine.** Candidate selection, importance scoring, clustering into days, route ordering and scheduling, all implemented from scratch.
- **Realistic schedules.** Visit duration depends on place type and visit mode (outside only / main museums / everywhere), optional queue time, lunch, coffee and dinner breaks.
- **Interactive map.** Day-by-day timeline, numbered markers, walking path, and nearby cafes, restaurants and pharmacies within 500 m (PostGIS `ST_DWithin`).
- **Live inside/outside toggle.** Switch a museum between "outside" and "inside" and the whole day recalculates instantly.
- **One-click navigation.** Open the day's route in Google Maps or Apple Maps.
- **AI with guardrails.** OpenAI tool calling with a rule-based fallback; every value is sanitized before reaching the algorithm.
- **Authentication and data ownership.** JWT auth; users can only access their own routes.

## How It Works

```
User text ──► AI parser (OpenAI tool calling | rule-based fallback) ──► sanitize
                                                                          │
OpenStreetMap ──► PostgreSQL + PostGIS                                    ▼
                         │                                  Route Engine
                         └──────────► candidate selection ► deduplication (150 m, Levenshtein)
                                      importance scoring    clustering into days (K-Means / DBSCAN)
                                      dwell-time model      ordering (Nearest Neighbor / 2-opt)
                                      Arno river penalty    scheduling (lunch, coffee, dinner)
                                                                          │
                                                                          ▼
                                                      Timeline + interactive map (Next.js)
```

**Design principle:** the LLM never generates places or coordinates. It only extracts parameters (days, hours, pace, interests). The itinerary is built by reproducible algorithms over stored geodata.

### Algorithms

| Stage | Implementation |
|---|---|
| Distance | Haversine formula (metres on a sphere) + river-crossing penalty for the Arno |
| Clustering into days | K-Means (k-means++ init, seeded), DBSCAN, size-balanced K-Means |
| Route ordering | Nearest Neighbor (baseline), 2-opt (improvement), exact brute force (reference, up to 9 points) |
| Deduplication | Proximity (150 m) + normalized-name similarity (substring, token subset, Levenshtein) |
| Importance score | Category weight, Wikidata/Wikipedia presence, interest match, centrality (pace-dependent), landmark bonus |
| Scheduling | Per-type dwell time, visit modes, queues, meal rules, day-filling up to 80% of the time budget |

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Monorepo | pnpm workspaces, Turborepo |
| Backend | NestJS 11, REST, Swagger (OpenAPI) |
| Database | PostgreSQL 16 + PostGIS 3.5, Prisma 6 |
| Auth and security | JWT, bcrypt, Helmet, Throttler (rate limiting), class-validator |
| AI | OpenAI API (tool calling), rule-based fallback parser |
| Frontend | Next.js 15, React 19, MapLibre GL |
| Infrastructure | Docker Compose (PostgreSQL/PostGIS, Redis) |
| Testing | Vitest, Supertest |

## Project Structure

```
route-planner/
├── apps/
│   ├── api/                      # NestJS backend
│   │   ├── prisma/               # Schema and migrations
│   │   ├── scripts/              # OSM import, verification, benchmark
│   │   ├── src/
│   │   │   ├── ai/               # NL → parameters (OpenAI + rules + sanitize)
│   │   │   ├── auth/ users/      # JWT authentication
│   │   │   ├── poi/              # Nearby search (PostGIS)
│   │   │   ├── routes/           # Route CRUD
│   │   │   ├── planning/         # Bridges API and Route Engine
│   │   │   └── engine/           # Route Engine (clustering, TSP, scheduling)
│   │   └── test/                 # Integration tests (real database)
│   └── web/                      # Next.js frontend
├── packages/types/               # Shared types
├── docs/                         # Benchmark results
├── scripts/bootstrap.sh          # One-command setup
└── docker-compose.yml
```

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| macOS / Linux | macOS tested |
| Node.js | 20.19+ (22 LTS recommended) |
| pnpm | 9+ |
| Docker Desktop | Running |
| Git, `jq` | Optional `jq` for manual API checks |

An OpenAI API key is **optional**. Without it, a rule-based parser (Ukrainian and English) is used.

### Quick start

```bash
git clone <your-repo-url> route-planner
cd route-planner
./scripts/bootstrap.sh
```

The bootstrap script creates `.env` (with a generated `JWT_SECRET`), starts Docker services, installs dependencies, applies migrations and imports OSM data (internet required, about a minute).

### Manual setup

```bash
cp .env.example .env                                  # then set a strong JWT_SECRET (32+ chars)
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > apps/web/.env.local
docker compose up -d
pnpm install
pnpm --filter api prisma:generate
pnpm --filter api db:deploy
pnpm --filter api poi:import
```

## Configuration

Environment variables (`.env` in the repository root, see `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database credentials | `travel` / dev password / `travel_explorer` |
| `POSTGRES_PORT` | Host port for PostgreSQL | `5433` |
| `REDIS_PORT` | Host port for Redis | `6379` |
| `DATABASE_URL` | Prisma connection string (port must match) | — |
| `JWT_SECRET` | Token signing secret, minimum 32 characters | **required** |
| `JWT_EXPIRES_IN_SECONDS` | Token lifetime | `86400` |
| `API_PORT` | API port | `4000` |
| `CORS_ORIGIN` | Allowed web origins, comma-separated | `http://localhost:3000` |
| `OPENAI_API_KEY` | Optional; enables LLM parsing | empty |
| `OPENAI_MODEL` | Model name | `gpt-4o-mini` |

`apps/web/.env.local`: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). Restart the web server after changing it.

> Never commit `.env`. It is listed in `.gitignore`.

## Running the Project

Use two terminals from the repository root:

```bash
# Terminal 1: API  (http://localhost:4000, Swagger at /docs)
pnpm --filter api dev

# Terminal 2: Web  (http://localhost:3000)
pnpm --filter web dev
```

Then open <http://localhost:3000>, register an account and create a route in **Planner**. Open the web app via `localhost` (CORS is configured for it).

Useful commands:

| Command | Purpose |
|---|---|
| `docker compose up -d` / `docker compose down` | Start / stop PostgreSQL and Redis (data persists) |
| `pnpm --filter api db:studio` | Browse the database in Prisma Studio |
| `pnpm --filter api poi:import` | (Re)import Florence POIs from OpenStreetMap |
| `pnpm --filter api poi:verify` | Verify imported data and PostGIS queries |
| `pnpm --filter api engine:demo` | Run the engine on real data from the console |
| `pnpm --filter api build` / `pnpm --filter web build` | Production builds |

## API Overview

Interactive documentation: <http://localhost:4000/docs>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | API, database and PostGIS status |
| POST | `/auth/register` | No | Create account (rate-limited) |
| POST | `/auth/login` | No | Obtain JWT (rate-limited) |
| GET | `/auth/me` | Yes | Current user |
| GET | `/pois/nearby` | No | POIs within a radius, filterable by category |
| GET | `/pois/:id` | No | POI details |
| POST | `/ai/parse` | Yes | Free text → structured parameters (rate-limited) |
| POST | `/routes` | Yes | Generate and store a route |
| GET | `/routes`, `/routes/:id` | Yes | List / get own routes |
| DELETE | `/routes/:id` | Yes | Delete own route |

Example:

```bash
curl -s "localhost:4000/pois/nearby?lat=43.7731&lon=11.256&radius=300&categories=CAFE,BAR&limit=5"
```

## Testing

```bash
pnpm --filter api test
```

46 tests: algorithm unit tests (clustering, ordering, dwell time, deduplication, river penalty), AI parser tests, and integration tests running real HTTP requests against a real database (authentication, ownership, validation, rate limiting, security headers, route generation). Requires Docker services to be running.

## Benchmark

```bash
pnpm --filter api benchmark
```

Runs 32 scenarios (2–5 days × interest sets × pace levels) and writes `docs/benchmark-results.md`.

Latest findings (Florence data):

| Question | Result |
|---|---|
| Day grouping | Plain K-Means is compact but produced single-point days in 25 scenarios; size-balancing eliminated them (0). DBSCAN (ε = 400 m) gave the most even days, with 3 weak days. No method wins on every metric. |
| Visit order | 2-opt matched the exact optimum; Nearest Neighbor was about 12% longer and random order about 40% longer. |

Results depend on the dataset and parameters; see `docs/benchmark-results.md` for the latest run.

## Security

- Passwords stored only as bcrypt hashes; JWT authentication on protected routes.
- Resource ownership enforced (other users' routes return 404).
- DTO validation with unknown-field rejection; parameterized SQL (no string interpolation).
- Helmet security headers; rate limiting (global and stricter on auth and AI endpoints).
- LLM output is sanitized (numeric clamping, allow-listed interests); user text cannot override limits.
- Secrets kept in `.env`, excluded from version control; dependency audit with `pnpm audit --prod`.

Known trade-off: the token is stored in `localStorage` for simplicity; an httpOnly cookie is recommended for production.

## Limitations

- Single city (Florence); OSM data is incomplete (no ratings, sparse opening hours).
- Importance scoring, visit durations, pace thresholds and the Arno line are expert heuristics, not learned values.
- Distances use haversine × 1.3 as a walking estimate; map lines use a public pedestrian router when available and fall back to straight lines.
- Apple Maps links support only start and end points.
- Interests such as "nightlife" currently influence meals only, not dedicated venue stops.

## Roadmap

- Orienteering-problem formulation and comparison with metaheuristics (OR-Tools, simulated annealing, genetic algorithms).
- Self-hosted pedestrian routing for real distance matrices; automatic barrier detection from OSM geometry.
- Multi-city support and opening-hours-aware scheduling.
- Semantic POI search with pgvector; voice input (Whisper).
- Asynchronous generation (BullMQ + Redis, SSE progress), caching, E2E tests, CI/CD.
- Mobile client reusing the same API.

## AI Usage Disclosure

Generative AI tools were used as a development aid (code drafting, debugging, documentation). The author reviewed, tested and is responsible for the final implementation. In the product itself, an LLM is used solely to parse user requests into validated parameters.

## Data Attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the ODbL. Map tiles by OpenStreetMap; rendering by MapLibre GL.

## License

Educational project. Add a license of your choice (for example MIT) before publishing.
