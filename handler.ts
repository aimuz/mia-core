import { MiaConfig, VanityPackage } from "./types.ts";

function stripLeadingSlash(str: string): string {
  let s = str;
  while (s.startsWith("/")) {
    s = s.slice(1);
  }
  return s;
}

function stripTrailingSlash(str: string): string {
  let s = str;
  while (s.endsWith("/")) {
    s = s.slice(0, -1);
  }
  return s;
}

function trimSlashes(str: string): string {
  return stripTrailingSlash(stripLeadingSlash(str));
}

function ensureLeadingSlash(str: string): string {
  return str.startsWith("/") ? str : `/${str}`;
}

function stripProtocol(url: string): string {
  if (url.startsWith("https://")) return url.slice(8);
  if (url.startsWith("http://")) return url.slice(7);
  return url;
}

function matchPkg(
  pathname: string,
  pkgs: VanityPackage[],
): VanityPackage | null {
  // Normalize request path to ensure it starts with /
  const normalizedPath = ensureLeadingSlash(pathname);

  return pkgs.find((pkg) => {
    const pkgPrefix = ensureLeadingSlash(pkg.prefix);

    // Exact match: /foo
    if (normalizedPath === pkgPrefix) return true;

    // Subpath match: /foo/bar -> matches /foo/
    // We manually check the separator to avoid matching /foobar against /foo
    if (
      normalizedPath.startsWith(pkgPrefix) &&
      normalizedPath.charAt(pkgPrefix.length) === "/"
    ) {
      return true;
    }

    return false;
  }) ?? null;
}

function buildGoMetaHTML(
  pathname: string,
  host: string,
  godocHost: string,
  pkg: VanityPackage,
): string {
  // 1. Calculate Import Prefix
  // format: example.com/foo
  const cleanHost = stripTrailingSlash(stripProtocol(host));
  const cleanPrefix = trimSlashes(pkg.prefix);
  const importPrefix = `${cleanHost}/${cleanPrefix}`;

  // 2. Construct Repo URL
  const repo = stripTrailingSlash(pkg.repo);
  const vcs = pkg.vcs || "git";

  // Handle optional subdir in go-import (rare)
  let subdir = "";
  if (pkg.subdir && pkg.subdir !== "/") {
    subdir = ` ${trimSlashes(pkg.subdir)}`;
  }

  // meta name="go-import"
  const goImport = `${importPrefix} ${vcs} ${repo}${subdir}`;

  // 3. Construct Go Doc URL
  // Redirect to pkg.go.dev (standard) or configured host
  const cleanDocHost = stripTrailingSlash(stripProtocol(godocHost));
  const godoc = `https://${cleanDocHost}/${cleanHost}${
    ensureLeadingSlash(pathname)
  }`;

  // 4. Construct Go Source
  let goSource = pkg.goSource || "";

  if (!goSource) {
    // Generate default source patterns based on repo host
    if (repo.includes("bitbucket.org")) {
      goSource =
        `${importPrefix} ${repo}/src/default{/dir} ${repo}/src/default{/dir}/{file}#{file}-{line}`;
    } else {
      // GitHub default (using 'main' instead of 'master' for modern repos)
      // Note: GitHub supports both /tree/ and /blob/ for files, but standard implementation often uses tree
      // We use standard variable expansion provided by Go tools
      goSource =
        `${importPrefix} ${repo} ${repo}/tree/main{/dir} ${repo}/blob/main{/dir}/{file}#L{line}`;
    }
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="go-import" content="${goImport}">
    <meta name="go-source" content="${goSource}">
    <meta http-equiv="refresh" content="0; url=${godoc}">
  </head>
  <body>
    Nothing to see here. Please <a href="${godoc}">move along</a>.
  </body>
</html>`;
}

export async function miaHandleRequest(
  request: Request,
  config: MiaConfig,
): Promise<Response> {
  // 1. Determine Configuration (without mutating the original config object)
  const reqUrl = new URL(request.url);

  // Use configured URL or fallback to request host
  const configHost = config.url || reqUrl.host;

  // Use configured Godoc host or fallback to pkg.go.dev
  const godocHost = config.godoc?.host || "pkg.go.dev";

  const isQuiet = config.quiet ?? true;

  // 2. Logging
  if (!isQuiet) {
    console.log(`mia: received request for ${reqUrl.pathname}`);
  }

  // 3. Match Package
  const pkg = matchPkg(reqUrl.pathname, config.packages);

  if (!pkg) {
    return new Response("mia: no matching rule", { status: 404 });
  }

  // 4. Build Response
  const html = buildGoMetaHTML(reqUrl.pathname, configHost, godocHost, pkg);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
