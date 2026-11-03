# Ballot Compass

A shareable, mobile-friendly US election and ballot explorer. Enter a residential street address, then view available upcoming elections, candidate races and ballot measures.

## Publish with Netlify

1. Create a Google Cloud project. Enable **Google Civic Information API** and create an API key. See https://developers.google.com/civic-information/docs/using_api
2. Upload this folder to a GitHub repository (Netlify's Git-based deployment is recommended for serverless functions).
3. In Netlify, choose **Add new project → Import an existing project**, connect the GitHub repository, and deploy. The included `netlify.toml` configures the function and URL route.
4. Go to **Site configuration → Environment variables**, add `GOOGLE_CIVIC_API_KEY` with the Google key as its value. Redeploy after adding it.
5. Share the `https://your-site.netlify.app` address.

**Important:** Simply dragging and dropping the files to Netlify's static deploy area will not build the serverless function. Use a repository deployment (or the Netlify CLI with function support).

## Data and limitations

- Uses Google's `elections` and `voterinfo` endpoints. Availability varies by jurisdiction, election and time. Local or special elections and down-ballot details may be missing. This is NOT a guaranteed complete official sample ballot.
- Searches for the next available election; when no ballot details are available, the app displays a warning rather than inventing candidates or ballot questions.
- Candidate background information is limited to the information and links Google provides. For full candidate biographies, endorsements, policies, arguments for and against a measure, and wider local coverage, connect a licensed comprehensive data provider such as BallotReady or Democracy Works.
- Addresses are POSTed to the Netlify function and then forwarded to Google's API. This project does not save addresses. Your hosting platform and Google may process logs under their respective policies. Consider adding a privacy policy before publicly launching.
- Do not expose a secret API key in client-side code. The function reads the key on the server. Restrict the key to this API and use Google Cloud quota/budget controls where possible. This is a proof-of-concept architecture; add rate limiting / bot defense for a widely shared public service.
- The date is based on the hosting server's current UTC day, so elections on the boundary of UTC dates may need timezone-specific treatment before a nationwide production launch.
- Use official election authorities to confirm deadlines, eligibility, and actual ballots: https://www.usa.gov/state-election-office

## Run locally

Install Netlify CLI, then run `netlify dev` in this directory after setting `GOOGLE_CIVIC_API_KEY` via a local `.env` file or Netlify environment configuration. Do not commit keys.
