import { miaHandleRequest } from "https://raw.githubusercontent.com/aimuz/mia-core/main/mod.ts";

Deno.serve((req: Request) =>
  miaHandleRequest(req, {
    packages: [
      {
        prefix: "example",
        repo: "https://github.com/YOUR_GITHUB_USER/your-repo",
      },
    ],
  })
);
