import initSqlJs, { Database, SqlValue } from 'sql.js';
import { IDatabaseAdapter, QueryResult } from './dbAdapter';

/**
 * Resolves configuration for sql.js in browser / web environments.
 * Prevents "TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type" by:
 * 1. Pre-fetching the WASM binary (trying local root, relative paths, and CDN mirrors).
 * 2. Enforcing a timeout on each fetch with AbortController to prevent startup freezes.
 * 3. Validating the WASM magic bytes (0x00 0x61 0x73 0x6d).
 * 4. Passing `wasmBinary` directly so that Emscripten bypasses streaming fetch/compile completely.
 * 5. Setting `locateFile` with mapped filenames and local/CDN fallback to prevent 404 HTML responses.
 */
export async function getWebSqlJsConfig(): Promise<any> {
  const locateFile = (file: string) => {
    // sql.js.org only hosts 'sql-wasm.wasm'. If sql-wasm-browser.js asks for
    // 'sql-wasm-browser.wasm', map it to 'sql-wasm.wasm' so it doesn't get a 404 HTML page.
    const wasmFile = file === 'sql-wasm-browser.wasm' ? 'sql-wasm.wasm' : file;
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin || '';
      const basePath = window.location.pathname ? window.location.pathname.replace(/\/[^/]*$/, '/') : '/';
      return `${origin}${basePath}${wasmFile}`;
    }
    return `https://sql.js.org/dist/${wasmFile}`;
  };

  const config: any = { locateFile };

  if (typeof fetch === 'function') {
    const candidates: string[] = [];

    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin || '';
      const basePath = window.location.pathname ? window.location.pathname.replace(/\/[^/]*$/, '/') : '/';
      candidates.push(
        `${origin}${basePath}sql-wasm.wasm`,
        `${origin}${basePath}sql-wasm-browser.wasm`,
        `${origin}/sql-wasm.wasm`,
        `${origin}/sql-wasm-browser.wasm`
      );
    }

    candidates.push(
      '/sql-wasm-browser.wasm',
      '/sql-wasm.wasm',
      './sql-wasm.wasm',
      './sql-wasm-browser.wasm',
      'https://sql.js.org/dist/sql-wasm.wasm',
      'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/sql-wasm.wasm',
      'https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/sql-wasm.wasm'
    );

    // Deduplicate candidate URLs while preserving priority order
    const uniqueCandidates = Array.from(new Set(candidates));

    for (const url of uniqueCandidates) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
      try {
        const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            if (
              bytes.length >= 4 &&
              bytes[0] === 0x00 &&
              bytes[1] === 0x61 &&
              bytes[2] === 0x73 &&
              bytes[3] === 0x6d
            ) {
              config.wasmBinary = buffer;
              break;
            }
          }
        }
      } catch {
        // Fall back to next candidate URL
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  }

  return config;
}

/**
 * Loads sql.js engine:
 * 1. Tries standard WebAssembly build with provided configuration (or custom engine loader).
 * 2. If WebAssembly fails (e.g. strict CSP, unsupported browser, corrupted binary, compile error),
 *    falls back to pure JavaScript ASM.js SQLite engine (`sql.js/dist/sql-asm.js`).
 */
export async function loadSqlJsEngine(
  config?: any,
  engineLoader?: (cfg?: any) => Promise<any>
): Promise<any> {
  const loader = engineLoader || initSqlJs;
  try {
    return await loader(config);
  } catch (wasmErr) {
    console.warn('[AEVIA] WebAssembly SQLite initialization failed, falling back to ASM.js engine:', wasmErr);
    try {
      // Lazy load pure JavaScript asm.js build of SQLite
      const initSqlJsAsm = require('sql.js/dist/sql-asm.js');
      const initializer = typeof initSqlJsAsm === 'function' ? initSqlJsAsm : initSqlJsAsm.default;
      if (typeof initializer === 'function') {
        return await initializer(config);
      }
      throw new Error('ASM.js initializer not found');
    } catch (asmErr) {
      console.error('[AEVIA] ASM.js SQLite fallback also failed:', asmErr);
      throw wasmErr; // Throw original WASM error if fallback also fails
    }
  }
}

export class SqlJsAdapter implements IDatabaseAdapter {
  private db: Database | null = null;
  private inTransaction = false;
  private dirty = false;

  private constructor(
    db: Database,
    private readonly persistSnapshot?: (bytes: Uint8Array) => Promise<void> | void
  ) {
    this.db = db;
  }

  static async create(
    customConfig?: any,
    engineLoader?: (cfg?: any) => Promise<any>
  ): Promise<SqlJsAdapter> {
    let config = customConfig;
    if (!config && typeof window !== 'undefined') {
      config = await getWebSqlJsConfig();
    }
    const SQL = await loadSqlJsEngine(config, engineLoader);
    const db = new SQL.Database();
    return new SqlJsAdapter(db);
  }

  /**
   * Browser-only durable SQL.js database. Tests keep using create(), which is
   * intentionally isolated and in-memory; the application uses this factory
   * so a full reload does not erase the user's history.
   */
  static async createPersistent(
    storageKey: string,
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    customConfig?: any,
    engineLoader?: (cfg?: any) => Promise<any>
  ): Promise<SqlJsAdapter> {
    const targetStorage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    let config = customConfig;
    if (!config && typeof window !== 'undefined') config = await getWebSqlJsConfig();
    const SQL = await loadSqlJsEngine(config, engineLoader);

    let initialBytes: Uint8Array | undefined;
    if (targetStorage) {
      try {
        const encoded = targetStorage.getItem(storageKey);
        if (encoded) initialBytes = decodeBase64(encoded);
      } catch {
        // Private browsing or a corrupt snapshot should not prevent startup.
      }
    }

    let db: Database;
    try {
      db = initialBytes ? new SQL.Database(initialBytes) : new SQL.Database();
    } catch {
      targetStorage?.removeItem(storageKey);
      db = new SQL.Database();
    }

    return new SqlJsAdapter(db, async (bytes) => {
      if (!targetStorage) return;
      targetStorage.setItem(storageKey, encodeBase64(bytes));
    });
  }

  async executeSql(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('DATABASE_CLOSED');
    }

    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA');

    if (isSelect) {
      const stmt = this.db.prepare(sql);
      try {
        if (params.length > 0) {
          stmt.bind(params as SqlValue[]);
        }
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        return {
          rows,
          rowsAffected: rows.length,
        };
      } finally {
        stmt.free();
      }
    } else {
      this.db.run(sql, params as SqlValue[]);
      this.dirty = true;
      const rowsAffectedRes = this.db.exec('SELECT changes() AS changes;');
      const rowsAffected = (rowsAffectedRes[0]?.values[0]?.[0] as number) ?? 1;
      let insertId: number | undefined;
      try {
        const lastInsertRes = this.db.exec('SELECT last_insert_rowid() AS id;');
        const val = lastInsertRes[0]?.values[0]?.[0] as number | undefined;
        if (typeof val === 'number' && val > 0) {
          insertId = val;
        }
      } catch {
        // ignore
      }

      const result = {
        rows: [],
        rowsAffected,
        insertId,
      };
      if (!this.inTransaction) await this.flush();
      return result;
    }
  }

  async transaction<T>(action: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('DATABASE_CLOSED');
    }

    const isNested = this.inTransaction;
    if (!isNested) {
      this.inTransaction = true;
      this.db.run('BEGIN TRANSACTION;');
    }

    try {
      const result = await action(this);
      if (!isNested) {
        this.db.run('COMMIT;');
        this.inTransaction = false;
        await this.flush();
      }
      return result;
    } catch (err) {
      if (!isNested) {
        try {
          this.db.run('ROLLBACK;');
        } catch {
          // ignore rollback error
        }
        this.inTransaction = false;
      }
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.flush();
      this.db.close();
      this.db = null;
    }
  }

  private async flush(): Promise<void> {
    if (!this.db || !this.persistSnapshot || !this.dirty) return;
    const bytes = (this.db as Database & { export(): Uint8Array }).export();
    await this.persistSnapshot(bytes);
    this.dirty = false;
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function decodeBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
