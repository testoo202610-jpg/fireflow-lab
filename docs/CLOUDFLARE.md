# GitHub and Cloudflare deployment

Updated 2026-10-14. A temporary Cloudflare Workers preview was published and
verified with a real browser EPANET solve:

https://fireflow-lab.frosted-editor.workers.dev/

This is a temporary preview account, not a permanent deployment in the user's
Cloudflare account. The CLI offered a time-limited account claim window. Account
claim links and credentials are not included in source, archives or public docs.
Do not rely on this preview URL for permanent hosting. Projects are saved in the
browser per origin; export JSON before moving to a different permanent domain.

## GitHub prerequisite

The authenticated GitHub integration still rejected `POST /user/repos` with
HTTP 403, `Resource not accessible by integration`, on 2026-10-14. The integration did not create a repository. A new empty repository subsequently
became available at https://github.com/testoo202610-jpg/fireflow-lab. The source
upload result is recorded in `VERIFICATION.md`.

The repository was verified as empty and writable before upload. GitHub creation
permissions remain unavailable through the integration, but existing-repository
source access is now available.

## Permanent Cloudflare Pages

The installed CLI is pinned to Wrangler 4.151.0. `wrangler.jsonc` declares the
Pages name and `dist` output; `npm run build:cloudflare` explicitly builds at the
origin root so browser Workers and the EPANET WASM asset resolve correctly.

Use normal Cloudflare authentication locally. Never send API tokens in chat:

```sh
npm install
npm run cloudflare:whoami
```

If using your own terminal, `npx wrangler login` performs Cloudflare's browser
authorization. In a managed execution environment, configure approved Cloudflare
credentials in the environment's secret settings instead of pasting them here.

Once authorized, create the Pages project once and deploy:

```sh
npm run cloudflare:create
npm run deploy:cloudflare
```

If you already created the same Pages project, skip the create command. Its
production branch must be `main`. The CLI returns the actual deployment URL;
do not infer or claim a `pages.dev` address before it reports success.

## Deploy from GitHub Actions

In the new repository's **Settings → Secrets and variables → Actions**, configure:

- Secret `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with
  **Account → Cloudflare Pages → Edit**, scoped to your hosting account.
- Secret `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID.
- Variable `CLOUDFLARE_DEPLOY_ENABLED`: `true` to enable deployment after successful
  main-branch CI. Leave it absent until the account/project/secrets are ready.

`.github/workflows/cloudflare.yml` publishes the exact successful CI commit. A
manual workflow dispatch is also available. It rebuilds with the Cloudflare base,
checks TypeScript, lint and the numerical tests, and uploads `dist` using the
pinned local Wrangler executable. Missing credentials cause a clear failure.

GitHub Pages remains an optional **manual** workflow; automatic publication is
configured for Cloudflare when enabled. The actual remote workflow status is recorded in `VERIFICATION.md`; local
checks do not establish that a remote workflow passed.

## Verification

Before considering permanent publication complete, check the returned URL,
`/epanet-2.2.wasm` (HTTP 200), and a real simulation in the browser. The temporary
Workers preview was checked for HTTP 200 on both assets, a Calculated simulation,
and no browser page errors. Permanent Pages publication has not occurred yet.
