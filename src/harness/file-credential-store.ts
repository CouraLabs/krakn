import type { CredentialStore, Credential, AuthOperationOptions, CredentialInfo } from "@earendil-works/pi-ai";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { app } from "../globals";

/**
 * File-backed credential store persisting to `~/.krakn/auth.json`
 * as `Record<providerId, Credential>` — the same file shape pi-ai's CLI uses.
 *
 * Writes are serialized per provider through a promise chain so concurrent
 * refreshes/logins cannot corrupt the map. A missing file is treated as an
 * empty credential map (never an error); `~/.krakn/auth.json` is only written
 * on login/modify.
 */
export class FileCredentialStore implements CredentialStore {
  private readonly filePath: string;
  private cache = new Map<string, Credential>();
  private chains = new Map<string, Promise<void>>();
  private loaded = false;

  constructor(filePath: string = join(app.settingsPath, "auth.json")) {
    this.filePath = filePath;
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!existsSync(this.filePath)) {
      this.cache = new Map();
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf-8")) as Record<string, Credential>;
      this.cache = new Map(Object.entries(parsed));
    } catch {
      this.cache = new Map();
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.cache), null, 2), "utf-8");
  }

  /** Serialize tasks per provider id without releasing the chain before active work settles. */
  private enqueue<T>(providerId: string, task: () => Promise<T>, options?: AuthOperationOptions): Promise<T> {
    const signal = options?.signal;
    const previous = this.chains.get(providerId) ?? Promise.resolve();
    const queued = (async () => {
      await previous.catch(() => { });
      signal?.throwIfAborted();
      return task();
    })();
    const tail = queued.catch(() => { }) as Promise<void>;
    this.chains.set(providerId, tail);
    void tail.then(() => {
      if (this.chains.get(providerId) === tail) this.chains.delete(providerId);
    });
    return queued;
  }

  async read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
    this.ensureLoaded();
    options?.signal?.throwIfAborted();
    return this.cache.get(providerId);
  }

  async list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
    this.ensureLoaded();
    options?.signal?.throwIfAborted();
    return [...this.cache].map(([providerId, credential]) => ({ providerId, type: credential.type }));
  }

  modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>,
    options?: AuthOperationOptions
  ): Promise<Credential | undefined> {
    return this.enqueue(providerId, async () => {
      this.ensureLoaded();
      const current = this.cache.get(providerId);
      const next = await fn(current);
      options?.signal?.throwIfAborted();
      if (next !== undefined) {
        this.cache.set(providerId, next);
        this.persist();
      }
      return next ?? current;
    }, options);
  }

  delete(providerId: string, options?: AuthOperationOptions): Promise<void> {
    return this.enqueue(providerId, async () => {
      this.ensureLoaded();
      this.cache.delete(providerId);
      this.persist();
    }, options);
  }
}
