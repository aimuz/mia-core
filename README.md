# mia-core

Lightweight Go vanity import handler that emits `go-import` / `go-source` meta
tags and redirects to a documentation host. Works in any Fetch-compatible
runtime, including Deno and Cloudflare Workers. Core logic lives in
`handler.ts`.

## Features

- Prefix-based routing to generate `go-import` meta tags compatible with
  `go get`
- Default `go-source` templates for GitHub/Bitbucket, with override support
- Redirects to a configurable doc host (default `godoc.org`)
- Zero dependencies; small surface area (`mod.ts`, `handler.ts`, `types.ts`)

## Quick start (ESM import)

Import directly from GitHub:

```ts
import { miaHandleRequest } from "https://raw.githubusercontent.com/aimuz/mia-core/main/mod.ts";
```

Or load via jsDelivr:

```ts
import { miaHandleRequest } from "https://cdn.jsdelivr.net/gh/aimuz/mia-core/mod.ts";
```

### Deno

```ts
import { miaHandleRequest } from "https://cdn.jsdelivr.net/gh/aimuz/mia-core/mod.ts";

Deno.serve((req: Request) =>
  miaHandleRequest(req, {
    packages: [
      {
        prefix: "mypkg",
        repo: "https://github.com/xxx/xx",
      },
    ],
  })
);
```

Run locally:

```bash
deno run --allow-net --allow-env examples/deno.ts
```

### Cloudflare Workers

```ts
import { miaHandleRequest } from "https://cdn.jsdelivr.net/gh/aimuz/mia-core/mod.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    return miaHandleRequest(request, {
      packages: [
        {
          prefix: "mypkg",
          repo: "https://github.com/xxx/xx",
        },
      ],
    });
  },
};
```

Go usage: `go get <your-domain>/mypkg`

## Configuration

`MiaConfig` (see `types.ts`):

- `godoc.host`: doc site host, default `godoc.org`
- `url`: public base URL, defaults to the request host
- `packages`: array of `VanityPackage`
  - `prefix`: path prefix to match, e.g. `mypkg` or `foo/bar`
  - `repo`: canonical VCS repo URL
  - `vcs`: optional, defaults to `git`
  - `subdir`: optional repo subdirectory
  - `goSource`: optional custom `go-source` template (auto-generated when
    omitted)

## Flow

- Match request path against configured prefixes
- Build `go-import` and `go-source` meta tags (uses GitHub/Bitbucket defaults if
  not provided)
- Respond with HTML that meta-refreshes to the doc host path

## Examples

- `examples/deno.ts`: Deno entry using local import
- `examples/cloudflare_worker.ts`: Worker entry with `fetch` handler
