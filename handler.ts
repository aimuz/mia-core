import { MiaConfig, VanityPackage } from "./types.ts";

function normalizePath(pathname: string): string {
  // If it doesn't start with "/", prepend one
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function normalizePrefix(prefix: string): string {
  // Prefix is usually something like "foo" / "foo/bar", normalize it to start with "/"
  return prefix.startsWith("/") ? prefix : `/${prefix}`;
}

function matchPkg(
  rawPathname: string,
  pkgs: VanityPackage[],
): VanityPackage | null {
  const pathname = normalizePath(rawPathname);

  return (
    pkgs.find((pkg) => {
      const prefix = normalizePrefix(pkg.prefix);

      // Exact match: /foo
      if (pathname === prefix) return true;

      // Subpath match: /foo/... or /foo/bar/...
      if (pathname.startsWith(prefix + "/")) return true;

      return false;
    }) ?? null
  );
}

function buildGoMetaHTML(
  rawPathname: string,
  config: MiaConfig,
  pkg: VanityPackage,
): string {
  const pathname = normalizePath(rawPathname);

  // importPrefix: example.com/foo[/bar]
  const importPrefix = `${config.url?.replace(/\/+$/, "")}/${
    pkg.prefix.replace(/^\/+/, "")
  }`;

  // Do not modify rule itself to avoid side effects
  const subdir = !pkg.subdir || pkg.subdir === "/"
    ? ""
    : pkg.subdir.replace(/^\/+/, "");

  const vcs = pkg.vcs || "git";

  // go-import: <import-prefix> <vcs> <repo> [subdir]
  let goImport = `${importPrefix} ${vcs} ${pkg.repo}`;
  if (subdir) {
    goImport += ` ${subdir}`;
  }

  // go doc / pkg site URL
  const godocHost = (config.godoc?.host ?? "godoc.org").replace(/\/+$/, "");
  const pathForDoc = `${config.url?.replace(/\/+$/, "")}${pathname}`;
  const godoc = `https://${godocHost}/${pathForDoc.replace(/^\/+/, "")}`;

  // go-source
  let goSource = pkg.goSource || "";

  const repoBase = pkg.repo.replace(/\/+$/, "");

  if (!goSource && repoBase.startsWith("https://bitbucket.org")) {
    goSource =
      `${importPrefix} ${repoBase}/src/default{/dir} ${repoBase}/src/default{/dir}/{file}#{file}-{line}`;
  }

  if (!goSource) {
    // Default GitHub format
    goSource =
      `${importPrefix} ${repoBase} ${repoBase}/tree/master{/dir} ${repoBase}/tree/master{/dir}/{file}#L{line}`;
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
</html>`.trim();
}

/**
 * Core handler: platform-independent, only depends on Request / Response / URL
 */
export async function miaHandleRequest(
  request: Request,
  config: MiaConfig,
): Promise<Response> {
  config.godoc = config.godoc || { host: "godoc.org" };
  config.url = config.url || (() => {
    const reqUrl = new URL(request.url);
    return reqUrl.host;
  })();
  config.quiet = config.quiet ?? true;

  if (!config.quiet) {
    console.log(`mia: received request for ${request.url}`);
  }

  const url = new URL(request.url);
  const pkg = matchPkg(url.pathname, config.packages);
  if (!pkg) {
    return new Response("mia: no matching rule", { status: 404 });
  }

  const html = buildGoMetaHTML(url.pathname, config, pkg);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
