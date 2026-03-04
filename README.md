# Parish Web Quality Platform

Web performance audit tool for Diocese of Bridgeport / Seton Collaborative.

## Features
- **Pre-Launch Quality Gate** — pass/fail against defined thresholds before any site goes live
- **Score Entry** — manual entry from PageSpeed Insights, averaged over 3 runs
- **AI Insights** — Claude-powered plain-language analysis for admins, developers, and leadership
- **Before/After Comparison** — delta view between old and new sites with pitch narrative
- **Monthly Health Dashboard** — portfolio view across all managed parishes

---

## Setup: GitHub + Netlify

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit — Parish Web Quality Platform"
git remote add origin https://github.com/YOUR_USERNAME/parish-web-quality.git
git push -u origin main
```

### 2. Connect to Netlify
1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect GitHub, select `parish-web-quality`
3. Build settings: leave blank (no build command, publish directory is `.`)
4. Click **Deploy site**

### 3. Add Your Anthropic API Key
1. In Netlify: **Site configuration** → **Environment variables**
2. Add variable: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
3. Redeploy (Deploys → Trigger deploy → Deploy site)

### 4. (Optional) Password Protect
Netlify → **Site configuration** → **Access control** → **Password protection**

---

## Usage

1. Open your Netlify URL on any device
2. Select a site from the sidebar (Old Site and New Site pre-loaded)
3. Go to **Enter Scores** → run each site at [pagespeed.web.dev](https://pagespeed.web.dev) 3× on both mobile and desktop, enter scores
4. Check **Pre-Launch Gate** for pass/fail verdict
5. Hit **AI Insights** for Claude's plain-language analysis
6. Use **Before/After** for the leadership pitch comparison
7. **Monthly Health** gives Roger a portfolio-level view

Scores persist in localStorage — no database needed.

---

## Thresholds (Pre-Launch Gate)

| Category | Mobile | Desktop |
|---|---|---|
| Performance | ≥ 80 | ≥ 90 |
| Accessibility | ≥ 90 | ≥ 90 |
| Best Practices | ≥ 90 | ≥ 90 |
| SEO | ≥ 90 | ≥ 90 |

---

## Adding More Parishes
Click **+ Add Site** in the sidebar. Each site tracks scores independently. The Monthly Health view shows all sites at a glance.
