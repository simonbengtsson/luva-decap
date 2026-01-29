import { API, GitHubBackend } from "decap-cms-backend-github";
import {
  AssetProxy,
  Config,
  Credentials,
  Cursor,
  DisplayURL,
  Entry,
  Implementation,
  ImplementationFile,
  PersistOptions,
  User,
} from "decap-cms-lib-util";

class LuvaBackend implements Implementation {
  githubBackend: GitHubBackend;
  config: Config & { githubToken: string };

  constructor(config: Config & { githubToken: string }) {
    const api = new API({
      token: config.githubToken,
      repo: config.backend.repo!,
      squashMerges: config.backend.squash_merges || false,
      initialWorkflowStatus: "draft",
      cmsLabelPrefix: config.backend.cms_label_prefix || "",
      branch: config.backend.branch || "main",
      getUser: () => ({} as any),
    });
    this.githubBackend = new GitHubBackend(config, {
      API: api,
    });
    this.config = config;
  }

  async getToken() {
    return this.config.githubToken;
  }

  logout() {
    location.href = "https://luvabase.com";
  }

  authComponent() {
    return (props: any) => {
      props.onLogin();
      return null;
    };
  }
  restoreUser(user: User) {
    return Promise.resolve(user);
  }
  authenticate(credentials: Credentials) {
    const user = {
      ...credentials,
      backendName: "luva",
      name: "Luvabase User",
    };
    return Promise.resolve(user);
  }

  // GitHub backend

  isGitBackend() {
    return true;
  }
  getEntry(path: string) {
    return this.githubBackend.getEntry(path);
  }
  entriesByFolder(folder: string, extension: string, depth: number) {
    return this.githubBackend.entriesByFolder(folder, extension, depth);
  }
  entriesByFiles(files: ImplementationFile[]) {
    return this.githubBackend.entriesByFiles(files);
  }
  getMediaDisplayURL(displayURL: DisplayURL) {
    return this.githubBackend.getMediaDisplayURL(displayURL);
  }
  getMedia(folder?: string) {
    return this.githubBackend.getMedia(folder || this.config.media_folder);
  }
  getMediaFile(path: string) {
    return this.githubBackend.getMediaFile(path);
  }
  persistEntry(entry: Entry, opts: PersistOptions) {
    return this.githubBackend.persistEntry(entry, opts);
  }
  persistMedia(file: AssetProxy, opts: PersistOptions) {
    return this.githubBackend.persistMedia(file, opts);
  }
  deleteFiles(paths: string[], commitMessage: string) {
    return this.githubBackend.deleteFiles(paths, commitMessage);
  }
  unpublishedEntries() {
    return this.githubBackend.unpublishedEntries();
  }
  unpublishedEntry(args: { id?: string; collection?: string; slug?: string }) {
    return this.githubBackend.unpublishedEntry(args);
  }
  unpublishedEntryDataFile(
    collection: string,
    slug: string,
    path: string,
    id: string
  ) {
    return this.githubBackend.unpublishedEntryDataFile(
      collection,
      slug,
      path,
      id
    );
  }
  unpublishedEntryMediaFile(
    collection: string,
    slug: string,
    path: string,
    id: string
  ) {
    return this.githubBackend.unpublishedEntryMediaFile(
      collection,
      slug,
      path,
      id
    );
  }
  updateUnpublishedEntryStatus(
    collection: string,
    slug: string,
    newStatus: string
  ) {
    return this.githubBackend.updateUnpublishedEntryStatus(
      collection,
      slug,
      newStatus
    );
  }
  publishUnpublishedEntry(collection: string, slug: string) {
    return this.githubBackend.publishUnpublishedEntry(collection, slug);
  }
  deleteUnpublishedEntry(collection: string, slug: string) {
    return this.githubBackend.deleteUnpublishedEntry(collection, slug);
  }
  getDeployPreview(collectionName: string, slug: string) {
    return this.githubBackend.getDeployPreview(collectionName, slug);
  }
  allEntriesByFolder(
    folder: string,
    extension: string,
    depth: number,
    pathRegex?: RegExp
  ) {
    return this.githubBackend.allEntriesByFolder(
      folder,
      extension,
      depth,
      pathRegex
    );
  }
  traverseCursor(cursor: Cursor, action: string) {
    return this.githubBackend.traverseCursor(cursor, action);
  }
  status() {
    return this.githubBackend.status();
  }
}

const { CMS, DECAP_CONFIG } = window as any;
CMS.registerBackend("luva", LuvaBackend);
CMS.init({
  config: DECAP_CONFIG,
});
