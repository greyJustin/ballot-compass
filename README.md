# Ballot Compass | AI research upgrade

This version upgrades the original Ballot Compass without changing its design. It keeps Google's Civic Information API for address-specific election identification and adds **optional** OpenAI-powered web research for election information and for individual contest details.

## Update your existing public website

1. Download and unzip `ballot-compass-ai.zip`.
2. In the **existing GitHub repository**, replace `index.html` and `netlify.toml` with the versions from this package.
3. Add `netlify/functions/research.mjs`. Retain `netlify/functions/lookup.mjs` (included here too). The exact folder structure matters.
4. Commit the updates. Netlify should deploy automatically from GitHub.
5. In Netlify, go to **Project configuration → Environment variables**, add `OPENAI_API_KEY` with your OpenAI API key, scope **Functions**, deploy context **Production**. Keep **Contains secret values** enabled. This is separate from ChatGPT Plus billing.
6. Keep the existing `GOOGLE_CIVIC_API_KEY` environment variable. The two APIs have different jobs.
7. **Trigger a new Netlify deploy** after saving environment variables. Open your site, enter a complete street address, then select **Research this election** or open a contest and select **Research this item**.

If your Netlify environment asks for different deploy-context values when secrets are enabled, add the key to **Production**. Never paste API keys into HTML, GitHub, or chat.

API key creation: https://platform.openai.com/api-keys
API billing: https://platform.openai.com/settings/organization/billing/overview
Responses API web search documentation: https://developers.openai.com/api/docs/guides/tools-web-search

## What it can and cannot do

- **Verified ballot coverage:** Google voterinfo may list a date but have no contests, and it may omit local contests. The app never treats a missing contest as evidence there is no contest.
- **AI election research:** The new button performs web searches using OpenAI and displays possible nearby contests and source links. These are explicitly **research leads**, not a complete or verified ballot for a given street address or precinct. The app cannot guarantee the precise ballot using AI alone. It avoids asserting the user's congressional or local legislative districts without official evidence.
- **AI contest research:** Opening a Google-returned item lets the user research publicly documented candidates, positions, and measures, with citations. AI summaries can be wrong or incomplete and must be verified with election authorities. Do not use these summaries as official ballot instructions.
- **Privacy:** Street address goes to Google through a Netlify Function; only city, state, election name, election date, and selected contest names are sent to OpenAI. This project does not intentionally store addresses, but infrastructure providers may retain access logs. Add your own privacy disclosure before marketing the site.
- **Citations:** The UI shows the source URLs returned as web search citations. Research findings may also display source links suggested by the model. Citations support further verification but do not prove an entry is on someone's personal ballot.
- **Public access and costs:** Every AI research click incurs OpenAI API charges (model and web search). The default model is `gpt-4.1-mini`; you can configure `OPENAI_MODEL` in Netlify to use a different web-search-capable model. Set billing limits and add Netlify bot protection / IP rate limits before promoting the site. This prototype has no persistent database, request quota, or shared caching.
- **Function runtime:** AI research may take tens of seconds; some Netlify plans have execution-duration limits. If calls time out, consider moving research to an asynchronous job architecture or using a faster model. The function currently times out a research request after 47 seconds.

## Check your deployment

Open `https://YOUR-SITE.netlify.app/.netlify/functions/research` in a browser. It should say `{"error":"Use POST."}`. If you see HTML or a 404, the function is not deployed correctly.

Visit https://www.usa.gov/state-election-office to cross-check official election information.
