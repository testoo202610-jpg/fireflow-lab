import { readFile } from "node:fs/promises";

// Keep wrangler.jsonc as plain JSON so CLI and CI use the same project name.
const config = JSON.parse(
  await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) {
  throw new Error("Cloudflare account credentials are not configured.");
}
if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-z0-9-]+$/.test(config.name)) {
  throw new Error("Invalid Cloudflare account ID or Pages project name.");
}
const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
const response = await fetch(`${base}/${config.name}`, {
  headers,
  signal: AbortSignal.timeout(30000),
});
if (response.ok) {
  const body = await response.json();
  if (!body.success || body.result?.production_branch !== "main") {
    throw new Error("Existing Pages project must have production branch main.");
  }
  console.log(`Pages project ${config.name} is ready.`);
} else if (response.status === 404) {
  const created = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: config.name, production_branch: "main" }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await created.json();
  if (!created.ok || !body.success) {
    throw new Error(`Could not create Pages project (HTTP ${created.status}).`);
  }
  console.log(`Created Pages project ${config.name}.`);
} else {
  throw new Error(`Could not inspect Pages project (HTTP ${response.status}).`);
}
