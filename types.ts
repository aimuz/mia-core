export interface MiaConfig {
  godoc?: {
    host: string; // default: godoc.org
  };
  url?: string; // default use request host
  quiet?: boolean; // default: true, suppress log output
  packages: VanityPackage[];
}

export interface VanityPackage {
  prefix: string;
  repo: string;
  vcs?: "git" | "fossil" | "hg" | "bzr" | "svn";
  subdir?: string;
  goSource?: string;
}
