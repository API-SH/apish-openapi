# API.SH OpenAPI specs

OpenAPI 3.1 specs for every platform on API.SH, one file per platform, refreshed every day from the live catalog.

API.SH turns public web pages from around 1,000 websites into clean JSON: search engines, social media,
e-commerce, real estate, jobs, travel, news and sports (Google, Amazon, TikTok, Zillow, LinkedIn and more).
Each spec here describes one platform's endpoints: their parameters, the credits each call costs, and an example
response taken from a real call.

## What's here

| Path | |
| --- | --- |
| [`specs/<slug>.json`](specs/) | One OpenAPI 3.1 document per platform, e.g. [`specs/zillow.json`](specs/zillow.json) |
| [`index.json`](index.json) | Every platform: `slug`, `name`, `category`, `endpoints` (count), `spec` (path here) and `url` (live copy) |
| [`scripts/sync.mjs`](scripts/sync.mjs) | Refreshes everything from the live catalog. Node 18+, no dependencies, no API key |
| [`.github/workflows/sync.yml`](.github/workflows/sync.yml) | Runs the sync every day and commits what changed |

The same specs are served live at `https://api.sh/openapi/<slug>.json`; this repository adds history (every change
is a commit you can diff), a single place to clone them all, and a stable path for tools that read from GitHub.

Every spec uses the server `https://api.api.sh` and an API key in the `x-api-key` header. Every endpoint is a
`GET` with query parameters that returns JSON; the shared parameters (`raw`, `fields`, `fresh`, `output`) are in
each spec too.

One platform's spec is read from its live URL instead of being stored here: legislation.gov.uk
([api.sh/openapi/legislation-gov-uk.json](https://api.sh/openapi/legislation-gov-uk.json?utm_source=github&utm_medium=readme)), because its
amendment record ids look like an access key to GitHub's secret scanning.

## Use the specs

You need an API key for the calls themselves: create a free account at
[app.api.sh/signup](https://app.api.sh/signup?utm_source=github&utm_medium=readme); every account gets free monthly credits.

**Postman / Insomnia / Bruno.** Import a spec file (or its raw GitHub URL) as an OpenAPI collection, then set the
`x-api-key` value in the collection's auth.

**openapi-generator.** A typed client for one platform in your language:

```sh
npx @openapitools/openapi-generator-cli generate -i specs/zillow.json -g python -o zillow-client
```

For all platforms at once in Python or JavaScript, the official SDKs are simpler:
[`apish-sdk`](https://pypi.org/project/apish-sdk/) and [`@api.sh/sdk`](https://www.npmjs.com/package/@api.sh/sdk).

**Speakeasy, Stainless, Fern and other SDK generators** take these files as they are: point them at the spec of
each platform you need.

**LLM tools and agents.** Give a model the spec of the platform it needs (most are well under 100 KB; the example
responses are the bulk of the larger ones) and it can call the endpoints correctly, or turn the `paths` into
function or tool definitions. For Claude Desktop, Cursor,
ChatGPT and other MCP clients there is a ready MCP server at [api.sh/mcp](https://api.sh/mcp?utm_source=github&utm_medium=readme), and the SDKs ship
tool definitions for OpenAI and Anthropic tool use.

**Find a platform.** `index.json` is small enough to search:

```sh
jq -r '.platforms[] | select(.category == "real estate") | "\(.slug)\t\(.endpoints)"' index.json
```

## Refresh locally

```sh
node scripts/sync.mjs                 # everything
node scripts/sync.mjs reddit zillow   # just these
```

The script reads the free catalog at `https://api.api.sh/catalog`, downloads each platform's spec four at a time
with retries, writes only files that changed, removes specs of platforms that left the catalog, and rebuilds
`index.json`. A spec that can't be fetched keeps its last copy.

## Links

- Docs: [api.sh/docs](https://api.sh/docs?utm_source=github&utm_medium=readme) · Catalog of every platform: [api.sh/catalog](https://api.sh/catalog?utm_source=github&utm_medium=readme)
- Each platform's page, e.g. [api.sh/zillow-api](https://api.sh/zillow-api?utm_source=github&utm_medium=readme)
- Status: [status.api.sh](https://status.api.sh)

The specs describe API.SH's API; the data each endpoint returns comes from the public pages of the site named.

## License

MIT, see [LICENSE](LICENSE).
