import { miaHandleRequest } from "https://cdn.jsdelivr.net/gh/aimuz/mia-core/mod.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    return miaHandleRequest(request, {
      packages: [
        {
          prefix: "example",
          repo: "https://github.com/YOUR_GITHUB_USER/your-repo",
        },
      ],
    });
  },
};
