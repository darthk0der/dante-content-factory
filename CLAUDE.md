# Dante Labs — Content Factory V2
## CLAUDE.md — Full Build Brief

This is the authoritative instruction document for the Dante Labs Content Factory V2. Read it in full before writing any code.

---

## What you're building

A React + Vite app deployed on Vercel that serves as Dante Labs' complete content generation, review, scheduling, and publishing system. It covers:

- **Manual content generation** — condition landing pages, blog posts, Twitter/X posts, email campaigns, ad copy
- **Automated content pipelines** — SEO-driven blog queue, reactive spike content, daily automated X posts
- **Review and approval** — all content (manual and automated) passes through a human review gate before publishing
- **Publishing** — to the Dante Labs website repo (via GitHub API) and Twitter (via Twitter API v2)

V2 is a full replacement of the existing V1 build at `dante-content-factory.vercel.app`. Same Vercel project, same domain, rebuilt from scratch.

---

## Build in three phases

Work through these phases in order. Complete and confirm each phase before starting the next.

**Phase 1 — Core manual flow** ✅ COMPLETE
UI scaffold, Generate tab, Review Queue tab, Auto Queue tab (shell), Scheduled tab, Published tab, all 5 manual content types, publish routes (GitHub + Twitter), image generation, preview-first editor.

**Phase 2 — Auto Queue + SEO engine**
Fill in the Auto Queue tab with real data. SEO blog queue cron, weekly Ahrefs keyword scan, reactive spike detection, daily automated X post cron.

**Phase 3 — Social listening integration & Trend Hub** ✅ COMPLETE
Added `GET /api/social-trending` to the ARRCC project (separate deployment). Unified ARRCC social signals and Ahrefs SEO signals into a single "Trend Hub" via `_lib/insightBundleHelper.js`. Generates complete `insight_bundle` packages (Blog, Meta Ads, Google Ads, Landing Page Funnel) in a single workflow.

**Phase 4 — Workflow Polish** ✅ COMPLETE
UI and validation fixes. Character count constraints on prompts, stripping hashtags out of social copy, and separating Trend Hub from standard Auto Queue.

**Phase 5 — API Publishing Integrations** ⚠️ PARTIAL
Direct publishing architecture to replace Framer dependency. Added Resend API for emails, Meta Graph API for Facebook/Instagram, and LinkedIn API. 
*Note: Meta is fully tested and live. LinkedIn and Resend backend logic is written but pending API keys and testing.*

**Phase 6 — AI Memory System** ✅ COMPLETE
Added `api/extract-feedback.js` to automatically extract rules from manual user edits. Built the `MemoryTab.jsx` UI to surface, review, and delete the retroactively learned rules.

---

## Project structure

```
dante-content-factory/
├── api/
│   ├── generate-content.js       # POST — manual content generation via Anthropic API (✅ built)
│   ├── generate-image.js         # POST — image generation via fal.ai (✅ built)
│   ├── preview.js                # GET  — returns built HTML for iframe preview (✅ built)
│   ├── publish.js                # POST — routes to GitHub API or Twitter API (✅ built)
│   ├── schedule.js               # POST — saves content with scheduled_at to Redis (✅ built)
│   ├── queue.js                  # GET/PATCH/DELETE — Redis queue operations (✅ built)
│   ├── _lib/
│   │   ├── insightBundleHelper.js # Unifies Blog, Ad, and LP generation for the Trend Hub (✅ built)
│   │   └── conditionTemplate.js  # HTML schema compiler for Funnel logic (✅ built)
│   ├── cron-publish.js           # Vercel Cron — publishes scheduled items every 5 min (✅ built)
│   ├── cron-seo-queue.js         # Vercel Cron — weekly SEO keyword scan + generation (✅ built)
│   ├── cron-daily-tweet.js       # Vercel Cron — daily automated X post from condition pages (✅ built)
│   ├── cron-spike-detect.js      # Vercel Cron — daily reactive spike detection (✅ built)
│   ├── cron-social-ads.js        # Vercel Cron — daily execution of ARRCC social triggers (✅ built)
│   └── social-trending.js        # GET — reads ARRCC Redis, returns top social topics (✅ built)
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # Root — 5 tabs, routing, state (✅ built)
│   ├── components/
│   │   ├── GenerateTab.jsx       # Content type selector + inputs for all 5 types (✅ built)
│   │   ├── ReviewTab.jsx         # Manual queue (source: manual) — list + editor (✅ built)
│   │   ├── AutoQueueTab.jsx      # Auto-generated queue (source: seo/spike/tweet/ads) (✅ shell built)
│   │   ├── ScheduledTab.jsx      # Scheduled content list (✅ built)
│   │   ├── PublishedTab.jsx      # Published archive with platform links (✅ built)
│   │   ├── Editor.jsx            # Preview-first editor with Edit toggle for all content types (✅ built)
│   │   ├── FlagsPanel.jsx        # QA flags panel (✅ built)
│   │   └── PreviewPane.jsx       # iframe (landing/blog), Twitter card, email inbox, Meta/Google ad mocks (✅ built)
│   ├── data/
│   │   └── conditions.js         # Top-50 condition list (static) (✅ built)
│   ├── lib/
│   │   └── skills.js             # Client-side constants: labels, formats, email types, ad platforms (✅ built)
│   └── styles/
│       └── index.css
├── index.html
├── vite.config.js
├── package.json
├── vercel.json                   # Includes all cron job definitions
└── .env.example
```

---

## Environment variables

All already set in Vercel unless marked otherwise.

```
ANTHROPIC_API_KEY=              # ✅ Set
UPSTASH_REDIS_REST_URL=         # ✅ Set (Production) — add to Preview + Development
UPSTASH_REDIS_REST_TOKEN=       # ✅ Set (Production) — add to Preview + Development
GITHUB_TOKEN=                   # ✅ Set
GITHUB_REPO_OWNER=              # ✅ Set — dante-labs
GITHUB_REPO_NAME=               # ✅ Set — dante-labs-website
FAL_API_KEY=                    # ✅ Set
TWITTER_API_KEY=                # ✅ Set
TWITTER_API_SECRET=             # ✅ Set
TWITTER_ACCESS_TOKEN=           # ✅ Set (Read + Write)
TWITTER_ACCESS_TOKEN_SECRET=    # ✅ Set
AHREFS_API_KEY=                 # Add — Ahrefs API for SEO keyword scanning
ARRCC_URL=                      # Add — https://dante-review-bot-henna.vercel.app
ARRCC_API_SECRET=               # Add — shared secret for ARRCC social-trending endpoint auth
```

---

## UI — five tabs

### Tab 1: Generate
Manual content creation. Content type selector:
- Condition Landing Page
- Blog Post
- Twitter/X Post (with format selector: Educational / Story-Led / Awareness)
- Email Campaign
- Ad Copy (Google / Meta)

Condition Landing Page and Blog Post: topic/condition text input.
Twitter: topic input + format selector.
Email: campaign type selector (newsletter / product launch / re-engagement) + key message input.
Ad Copy: campaign objective + product selector (WGS / RNA / Oncology) + target audience input.

Generate button → calls `/api/generate-content` → on success, item appears in Review Queue tab. Show loading state during generation (10–20s expected). Images are auto-generated server-side for Twitter, blog, and landing pages — no manual button press required.

### Tab 2: Review Queue
Manually generated content pending approval. Items with `source: manual`.

List view: content type badge, topic, generated timestamp, QA status badge, flag count.

Click item → editor opens in **Preview mode by default** (preview is the primary view, not the field editor):
- **Preview pane** is shown first and takes up the full width:
  - Landing pages + blog posts: iframe rendering the populated template via `/api/preview`
  - Twitter: Twitter card mock with image
  - Email: inbox subject/preview line + rendered HTML body
  - Google Ads: SERP mock with 3 labelled variants (Benefit-led / Problem-aware / Social proof)
  - Meta Ads: Facebook feed mock with 3 labelled variants
- **Edit button** in the header toggles to the field editor view
- **FlagsPanel** always visible below the preview
- **Image panel** always visible below the preview (for Twitter/blog/landing only)
- **Mark Ready** button — disabled while any unresolved flags exist. Hard gate, no bypass.
- **Schedule** button — datetime picker, only available when `status: approved`
- **Publish Now** button — only available when `status: approved` (not shown for email/ad_copy)
- **Export JSON** button — always available, downloads `{slug}.json`
- **Export HTML** button — email only, downloads body HTML
- **Copy all variants** button — ad copy only, copies all variants to clipboard

### Tab 3: Auto Queue
Auto-generated content pending approval. Items with `source: seo_queue | spike | daily_tweet | social_ads`.

Same editor as Review Queue. Additional field visible: **Trigger** — shows why the item was generated (e.g. "SEO queue item #14 — Week 2", "Ahrefs spike: MTHFR 2.4× 12-month average", "Daily tweet — condition: long-qt-syndrome", "Social trending topic: EDS fatigue").

Same approval gate as Review Queue — Mark Ready disabled while flags open.

Auto-generated items never bypass this queue. Nothing publishes automatically without approval.

### Tab 4: Scheduled
Items with `status: scheduled`, sorted by `scheduled_at` ascending. Shows content type, topic, scheduled datetime, platform. Cancel button moves item back to `approved`.

### Tab 5: Published
Items with `status: published`, sorted by `published_at` descending. Shows content type, topic, published datetime, live URL or tweet link. Includes a "View post →" button powered by the `post_url` property returned from the publishing APIs.

### Tab 6: Memory
Displays the `content:global_rules` array from Redis. These rules are automatically extracted by Claude via `api/extract-feedback.js` when a user edits AI-generated content and clicks "Save". Includes a "Delete" button for manual curation of the AI's learning.

---

## Content types and skills

Skills are Markdown files committed to the `dante-labs-website` repo at `Documentation/05_Operations/Content_Factory/skills/`. Load via GitHub API at generation time. Cache in Redis for 1 hour (key: `skill_cache:{filename}`).

| Content type | Skill file | Published to |
|---|---|---|
| Condition landing page | `Landing_Page_Sections_SKILL.md` | `public/conditions/[slug]/index.html` via GitHub API |
| Blog post | `Blog_Post_SKILL.md` | `public/blog/[slug]/index.html` via GitHub API |
| Twitter/X post | `Twitter_Post_SKILL.md` | Twitter API v2 |
| Email campaign | Brand Voice SKILL (system prompt only — no dedicated skill file yet) | Preview + copy HTML |
| Ad copy | Brand Voice SKILL (system prompt only) | Copy to clipboard only — no API publish |

**Brand Voice SKILL location in repo:** `Documentation/02_Brand/Brand_Voice_SKILL.md` — load this as additional system prompt context for email and ad copy generation, and as secondary context for all other types.

---

## API routes — Phase 1

### POST /api/generate-content
**Input:**
```json
{
  "content_type": "landing_page | blog | twitter | email | ad_copy",
  "topic": "Long QT Syndrome",
  "format": "educational | story_led | awareness",
  "ad_platform": "google | meta",
  "email_type": "newsletter | product_launch | re_engagement",
  "source": "manual"
}
```

1. Fetch appropriate skill(s) from GitHub API (or Redis cache)
2. Call Anthropic API: `claude-sonnet-4-6`, `max_tokens` varies by type (twitter: 1500, blog/landing: 8000, email/ad: 3000–4000)
3. Parse response JSON (extracts from ```json code fence if present)
4. For Twitter, blog, and landing page: auto-generate image via fal.ai before saving (fail silently if FAL_API_KEY not set)
5. Save to Redis: key `content:{id}`, id indexed in `content:index` list
6. Return full content object

**Image prompts** must describe lifestyle editorial photography — real people in natural settings. Never hands in isolation. Never lab equipment. This is enforced in the user prompt sent to Anthropic.

**Content object shape:**
```json
{
  "id": "content-{timestamp}",
  "content_type": "landing_page | blog | twitter | email | ad_copy",
  "source": "manual | seo_queue | spike | daily_tweet | social_ads",
  "topic": "Long QT Syndrome",
  "slug": "long-qt-syndrome",
  "generated_at": "ISO timestamp",
  "status": "review | approved | scheduled | published",
  "published_at": null,
  "scheduled_at": null,
  "trigger": null,
  "content": {},
  "image_prompt": null,
  "image_url": null,
  "flags": [],
  "qa_status": "REQUIRES_REVISION | READY_FOR_REVIEW"
}
```

### POST /api/generate-image
**Input:** `{ "id": "content-{timestamp}", "image_prompt": "..." }`

1. Call fal.ai — use `fal-ai/flux-pro` for landing pages and blog posts, `fal-ai/flux/schnell` for Twitter
2. Update Redis record with `image_url`
3. If `FAL_API_KEY` not set: return `{ "pending": true }` — UI shows placeholder, does not block review

### POST /api/publish
Routes by `content_type`. Gate: `status` must be `approved`, no open flags.

**Landing page:**
1. Fetch `condition.html` template from GitHub API
2. Populate all CMS fields (see CMS field substitution table below)
3. Commit to `public/conditions/{slug}/index.html`
4. Commit message: `content: add condition page — {condition_name}`

**Blog post:**
1. Build full HTML file using site nav + blog template + footer from `condition.html`
2. Commit to `public/blog/{slug}/index.html`
3. Commit message: `content: add blog post — {title}`

**Twitter:**
1. OAuth 1.0a sign the request
2. `POST https://api.twitter.com/2/tweets` with `{ "text": content.text }`
3. On success: update Redis `status: published`, `tweet_url`

**Email:** No publish route — export HTML only.
**Ad copy:** No publish route — copy to clipboard only.

### POST /api/schedule
Validates `status: approved`, sets `status: scheduled` + `scheduled_at`.

### GET /api/queue
Returns all Redis keys matching `content:*`, sorted by `generated_at` descending.

### GET /api/cron-publish (every 5 minutes)
Checks all `status: scheduled` items where `scheduled_at <= now`. Calls publish logic for each. Updates Redis on result.

**vercel.json:**
```json
{
  "crons": [
    { "path": "/api/cron-publish", "schedule": "*/5 * * * *" },
    { "path": "/api/cron-daily-tweet", "schedule": "0 9 * * *" },
    { "path": "/api/cron-seo-queue", "schedule": "0 8 * * 1" },
    { "path": "/api/cron-spike-detect", "schedule": "0 7 * * *" }
  ]
}
```

## Environment Variables & API Keys

To enable all integrations, the following environment variables must be configured in Vercel:

### Core / AI
- `ANTHROPIC_API_KEY`: For Claude generation.
- `FAL_API_KEY`: For Fal.ai image/video generation.

### Database
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: For queue/memory storage.

### Social Publishing & APIs
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`: For Twitter v2 publishing.
- `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`: For Meta (Facebook/Instagram) publishing.
- `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_URN`: For LinkedIn publishing. (Pending)
- `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`: For Email broadcasting. (Pending)

### Cross-System Auth
- `ARRCC_API_SECRET`: Shared secret between ARRCC and Content Factory for secure webhook/API communication.

---

## Technical assumptions / Constraints

## CMS field substitution — landing page template

The `condition.html` template (at `public/condition.html` in the `dante-labs-website` repo) is pre-populated with BRCA example content. Populate it by replacing the values of elements identified by `data-cms-field` attributes and specific structural selectors.

**Generated JSON fields → template elements:**

| Field | Template target |
|---|---|
| `seo_title` | `<title>`, `og:title`, `twitter:title` |
| `seo_description` | `meta[name="description"]`, `og:description`, `twitter:description` |
| `canonical_url` | `link[rel="canonical"]`, `og:url` |
| `condition_category` | `[data-cms-field="condition_category"]` — append ` · WHOLE GENOME SEQUENCING` |
| `hero_headline` | `h1[data-cms-field="hero_headline"]` |
| `hero_subhead` | `p[data-cms-field="hero_subhead"]` |
| `category_anchor` | Breadcrumb category href: `/conditions/#{category_anchor}` |
| `category_label` | `[data-cms-field="category_label"]` |
| `condition_name` | All `[data-cms-field="condition_name"]` instances |
| `about_h2` | `h2[data-cms-field="about_h2"]` |
| `"ABOUT " + condition_name.toUpperCase()` | `span.eyebrow` in Section 2 |
| `about_body_p1/p2/p3` | `[data-cms-field="about_body"] p:nth-child(1/2/3)` — omit p3 element entirely if empty |
| `about_subtype_callout` | `.cond-subtype-callout p` — hide entire `.cond-subtype-callout` div if empty |
| `why_wgs_h2` | `h2[data-cms-field="why_wgs_h2"]` |
| `why_wgs_card_1_headline` | `h3[data-cms-field="why_wgs_card_1_headline"]` |
| `why_wgs_card_1_body` | `p[data-cms-field="why_wgs_card_1_body"]` |
| `why_wgs_card_2_headline` | `h3[data-cms-field="why_wgs_card_2_headline"]` |
| `why_wgs_card_2_body` | `p[data-cms-field="why_wgs_card_2_body"]` |
| `schema_*` fields | JSON-LD `<script type="application/ld+json">` block |

**Locked sections — do not modify:** Nav, trust strip, distinction grid (3 WGS education cards), Outcomes section, Who We Help section, Proof Band, FAQ accordion, Patient Advocacy Groups form, CTA Block, Footer.

---

## Content schemas

### Landing page content
```json
{
  "condition_name": "Long QT Syndrome",
  "condition_slug": "long-qt-syndrome",
  "condition_category": "CARDIAC ARRHYTHMIA",
  "category_anchor": "cardiovascular",
  "category_label": "Cardiovascular",
  "seo_title": "Long QT Syndrome — Whole Genome Sequencing | Dante Labs",
  "seo_description": "...",
  "canonical_url": "https://dantelabs.com/conditions/long-qt-syndrome/",
  "og_url": "https://dantelabs.com/conditions/long-qt-syndrome/",
  "hero_headline": "...",
  "hero_subhead": "...",
  "about_h2": "Long QT Syndrome (LQTS)",
  "about_body_p1": "...",
  "about_body_p2": "...",
  "about_body_p3": "",
  "about_subtype_callout": "",
  "why_wgs_h2": "...",
  "why_wgs_card_1_headline": "...",
  "why_wgs_card_1_body": "...",
  "why_wgs_card_2_headline": "...",
  "why_wgs_card_2_body": "...",
  "schema_alternate_names": ["LQTS"],
  "schema_description": "...",
  "schema_anatomy": "...",
  "schema_treatment": "..."
}
```

### Blog post content
```json
{
  "title": "Is ADHD Genetic?",
  "slug": "is-adhd-genetic",
  "meta_description": "...",
  "hero_image_alt": "A family discussing genetic test results with a doctor",
  "primary_keyword": "is adhd genetic",
  "structure_variant": "F",
  "word_count": 1500,
  "body_html": "<p>Full article HTML...</p>",
  "image_prompt": "Editorial lifestyle photo: [specific scene relevant to topic]. Real people, warm setting. No hands in isolation, no lab equipment."
}
```

### Twitter content
```json
{
  "text": "≤280 character tweet",
  "format": "educational | story_led | awareness",
  "character_count": 214,
  "image_prompt": "Editorial lifestyle photo: [specific scene]. Real person, warm setting. No hands in isolation, no lab equipment.",
  "brand_check": {
    "no_exclamation_points": true,
    "no_banned_words": true,
    "no_diagnostic_claims": true,
    "patient_is_subject": true,
    "character_count_verified": true
  }
}
```

### Email content
```json
{
  "subject": "Email subject line (max 60 chars)",
  "preview_text": "Preview text shown in inbox (max 90 chars)",
  "headline": "Email headline",
  "body_html": "<p>Proper HTML only — no raw \\n escapes. Use p, strong, ul, li tags.</p>",
  "cta_text": "CTA button label",
  "cta_url": "https://dantelabs.com/genome/"
}
```

### Ad copy content — Google
```json
{
  "platform": "google",
  "campaign_objective": "...",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "headline_1": "≤30 chars",
      "headline_2": "≤30 chars",
      "headline_3": "≤30 chars",
      "description_1": "≤90 chars",
      "description_2": "≤90 chars"
    },
    { "variant_focus": "Problem-aware", "...": "..." },
    { "variant_focus": "Social proof", "...": "..." }
  ]
}
```

### Ad copy content — Meta
```json
{
  "platform": "meta",
  "campaign_objective": "...",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "primary_text": "Main feed copy shown above image (max 125 chars)",
      "headline": "Bold headline below image (max 40 chars)",
      "description": "Supporting line below headline (max 30 chars)",
      "cta_button": "Learn More"
    },
    { "variant_focus": "Problem-aware", "...": "..." },
    { "variant_focus": "Social proof", "...": "..." }
  ]
}
```

**Google and Meta use completely different schemas.** Google: headline_1/2/3 + description_1/2. Meta: primary_text + headline + description + cta_button. Each has 3 variants with clearly different angles.

---

## Phase 2 — Automated pipelines

### Daily automated X post (cron: 9am daily)
`GET /api/cron-daily-tweet`

1. Fetch list of all published condition pages from `public/conditions/` via GitHub API (directory listing)
2. Get last-tweeted condition from Redis (`auto_tweet:last_condition`)
3. Pick the next condition in alphabetical rotation — skip any condition tweeted in the last 30 days (`auto_tweet:history:{slug}`)
4. Fetch that condition's `index.html` from GitHub API
5. Extract: `hero_headline`, `hero_subhead`, `condition_name`, `condition_slug`, `why_wgs_card_1_headline`
6. Call Anthropic API with `Twitter_Post_SKILL.md` as system prompt, condition data as input, format: `awareness`
7. Save to Redis as content item with `source: daily_tweet`, `status: review` → appears in Auto Queue
8. Update `auto_tweet:last_condition` and `auto_tweet:history:{slug}` in Redis

### SEO blog queue (cron: 8am every Monday)
`GET /api/cron-seo-queue`

**Part A — Process pre-defined queue:**
The SEO Content Engine doc defines 142 blog posts across 12 weeks. Store the full queue in Redis as `seo_queue:items` (JSON array) on first run. Each Monday, select the items scheduled for that week based on phase/week number. For each item:
1. Check deduplication: does a page already exist at that URL in the repo? If yes, skip.
2. Enforce velocity: max 4 items per day, max 20 per week (weeks 1–6), stagger publish times 8am–6pm ET
3. Generate content via Anthropic API using `Blog_Post_SKILL.md` + the item's brief (keyword, variant, word count, internal links, CTA variant)
4. Save to Redis with `source: seo_queue`, `status: review` → appears in Auto Queue

**Part B — Ahrefs keyword scan:**
1. Call Ahrefs Keywords Explorer API with seed queries: `"is genetic"`, `"is hereditary"`, `"genetic testing for"`, `"gene mutation"`, `"whole genome sequencing"`
2. Filter: US market, volume ≥ 100, KD ≤ 40, word count ≥ 3
3. Score: `Priority Score = (Volume × 0.6) + ((100 - KD) × 0.3)`
4. Cross-reference against existing Redis queue and published pages — skip any already covered
5. Any new opportunity with Priority Score > 500: add to `seo_queue:items` for next available week slot

**Ahrefs API base URL:** `https://api.ahrefs.com/v3`
**Auth:** Bearer token using `AHREFS_API_KEY`

### Reactive spike detection (cron: 7am daily)
`GET /api/cron-spike-detect`

Checks three signal sources:

**1. Ahrefs volume spike:**
- Track seed keywords in Redis (`spike:baseline:{keyword}` = 12-month average volume)
- Pull current month volume from Ahrefs Keywords Explorer
- Spike = current volume ≥ 2× baseline
- Cross-reference: skip if Dante already has a page for that keyword

**2. News monitoring:**
- Call Anthropic API with web search tool enabled
- Query: `"genetic testing news OR genomics OR gene discovery OR dna test OR hereditary cancer" last 48 hours`
- Ask Claude to evaluate: is this relevant to Dante's market AND likely to generate new search demand?
- Return topics that pass both tests

**3. Google Trends:**
- Use SerpAPI or similar to check Google Trends for "genetic testing" category breakout terms
- Flag any term showing ≥ 200% increase

For each detected spike:
1. Check: does Dante already have a page for this topic? If yes, skip.
2. Check: have we already published a reactive page for this topic? (`spike:published:{slug}`) If yes, skip.
3. Max 2 reactive pages per day — if limit reached, queue for next day
4. Generate reactive page content via Anthropic (400–800 words, lighter format)
5. Save with `source: spike`, `trigger: "MTHFR Ahrefs spike 2.4×"`, `status: review` → Auto Queue
6. Target URL: `/insights/{slug}/` — new path distinct from `/blog/`

### SEO blog post HTML template
Blog posts publish to `public/blog/{slug}/index.html`. Build the HTML file using:
- Full `<head>` with meta, canonical, OG, Twitter card tags
- Site nav copied verbatim from `condition.html`
- Hero image (`<img>` tag pointing to `image_url` or placeholder `/media/blog-placeholder.jpg`)
- `<article>` with `body_html` content
- Internal links as specified in the brief (2–3 condition pages + 1 site architecture page + 1 product page)
- CTA block matching the assigned `cta_variant` from the SEO engine doc
- Site footer copied verbatim from `condition.html`
- Links to `/base.css`, `/blog.css`, `/common.js`, `/currency-switcher.js`

---

## Phase 3 — Social listening → paid ads

### Add endpoint to ARRCC
In the ARRCC project (`dante-review-bot-henna.vercel.app`), add one new file:

**`api/social-trending.js`**
```js
// GET /api/social-trending
// Returns top trending topics from ARRCC social listening module
// Auth: checks Authorization header against ARRCC_API_SECRET env var
```

1. Validate `Authorization: Bearer {ARRCC_API_SECRET}` header — return 401 if missing/invalid
2. Read social listening data from Redis — scan for keys matching the pattern ARRCC uses for stored mentions (inspect existing ARRCC code to find the exact key pattern)
3. Aggregate by topic/condition mentioned in the last 7 days
4. Return top 5 topics with mention count and sentiment:
```json
{
  "trending": [
    {
      "topic": "EDS fatigue",
      "mention_count": 34,
      "sentiment": "frustration",
      "sample_text": "example mention text",
      "category": "condition | brand | competitor | dissatisfaction"
    }
  ],
  "generated_at": "ISO timestamp"
}
```

Deploy this addition to ARRCC via `vercel deploy` from the ARRCC project directory.
Add `ARRCC_API_SECRET` to both ARRCC and Content Factory Vercel env vars (same value).

### Content Factory: paid ads from social listening
Add a cron or manual trigger in the Content Factory:

`GET /api/social-trends-to-ads` (can be triggered manually from Generate tab OR on a weekly schedule)

1. Call `GET {ARRCC_URL}/api/social-trending` with `Authorization: Bearer {ARRCC_API_SECRET}`
2. Take top 3 trending topics
3. For each: generate Google + Meta ad copy variants using Brand Voice SKILL as system prompt
4. Ad copy must connect the trending topic to whole genome sequencing without naming competitors
5. Save each as content item with `source: social_ads`, `status: review` → Auto Queue

---

## Design tokens

Match the Dante Labs website. From `public/base.css`:

```css
--color-bg: #f4f3f1
--color-dark: #1c2128
--color-card: #ffffff
--color-ink: #0a0e17
--color-text: #444444
--color-accent: #593159
--color-border: rgba(0,0,0,0.08)
```

Content Factory UI additional:
- Nav: `#1a1a1a` bg, white text
- Flag colours — LEGAL: `#dc2626`, MEDICAL: `#d97706`, BRAND: `#2563eb`
- Font: system-ui
- Border radius: 10px
- Cards: white bg, `1px solid #e5e5e5`

---

## Key behaviour rules

1. **Nothing auto-publishes** — every item, manual or automated, requires human approval in Review or Auto Queue before it can publish. No exceptions.
2. **Mark Ready / Publish Now are disabled** while any unresolved QA flags exist. Hard gate.
3. **`status: published` is never set** without a confirmed successful API response from GitHub or Twitter.
4. **All external API calls go through server-side `/api/` routes** — no keys reach the client.
5. **Preview is the default view** in the Editor. Fields are hidden behind an "Edit" toggle button. The preview is the main thing the user sees.
6. **PreviewPane** renders:
   - Landing pages + blog posts: iframe with blob URL from `/api/preview` — no network request to the live site
   - Twitter: Twitter card mock
   - Email: inbox header (subject/preview text) + rendered HTML body — body_html must be real HTML, no raw `\n` escapes
   - Google Ads: SERP mock, 3 variants labelled Benefit-led / Problem-aware / Social proof
   - Meta Ads: Facebook feed mock (primary_text above image, headline + description + CTA below) — completely different schema from Google
7. **Image generation is automatic** for Twitter, blog, and landing pages — triggered server-side at the end of `/api/generate-content`, not a separate manual step. Images use lifestyle editorial photography prompts (real people, warm settings). Never hands in isolation. Never lab equipment.
8. **Skill files are loaded from the `dante-labs-website` repo** via GitHub API, cached in Redis for 1 hour. Brand Voice SKILL (`Documentation/02_Brand/Brand_Voice_SKILL.md`) is loaded as supplementary context for all types, and as the primary system prompt for email and ad copy.
9. **If any API key is missing** (FAL, Twitter, Ahrefs): relevant features show a clear "not configured" state, do not throw unhandled errors, do not block other features.
10. **Velocity rules for SEO queue are enforced server-side**: max 4 items per day, max 20 per week (weeks 1–6), publish times staggered 8am–6pm ET. The cron never exceeds these limits regardless of queue size.
11. **Deduplication**: before generating any SEO or spike page, check that no existing page in the repo targets the same primary keyword. Use slug matching against the GitHub repo directory listing.

---

## Packages needed

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@upstash/redis": "latest",
    "@fal-ai/client": "latest",
    "oauth-1.0a": "latest",
    "crypto-js": "latest"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4"
  }
}
```

---

## Out of scope

Do not build:
- Customer story matching
- Brand auto-suggestion for BRAND flags
- Duplicate detection UI
- The full 6-section condition page scaffold from `content_factory_scaffold_v1.md` — V2 uses `Landing_Page_Sections_SKILL.md` for Sections 1–3 only, populates the full `condition.html` template

---

## Reference URLs

- Content Factory deployed: `dante-content-factory.vercel.app`
- ARRCC deployed: `dante-review-bot-henna.vercel.app`
- Dante Labs website repo: `github.com/dante-labs/dante-labs-website`
- Skills location: `Documentation/05_Operations/Content_Factory/skills/`
- Brand Voice SKILL: `Documentation/02_Brand/Brand_Voice_SKILL.md`
- Image SKILL: `Documentation/08_Media/Website_Image_Skill_Content/SKILL.md`
- condition.html template: `public/condition.html`
- SEO Content Engine doc: `Dante_Labs_SEO_Content_Engine_v2.md` (attached to this session — request from Andre if needed)
- fal.ai docs: `fal.ai/docs`
- Twitter API v2: `developer.twitter.com/en/docs/twitter-api`
- Ahrefs API v3: `ahrefs.com/api`
- Upstash Redis docs: `upstash.com/docs/redis`
