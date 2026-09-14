import { SqlJsAdapter, getWebSqlJsConfig, loadSqlJsEngine } from '../src/data/sqlJsAdapter';
import { getDatabase, resetDatabaseForTesting } from '../src/data/database';

describe('SqlJsAdapter & Web WASM loader', () => {
  describe('getWebSqlJsConfig', () => {
    it('returns a locateFile function mapping sql-wasm-browser.wasm to sql-wasm.wasm', async () => {
      const config = await getWebSqlJsConfig();
      expect(config).toBeDefined();
      expect(typeof config.locateFile).toBe('function');

      // sql.js.org only hosts 'sql-wasm.wasm'; mapping sql-wasm-browser.wasm avoids 404 HTML responses
      expect(config.locateFile('sql-wasm-browser.wasm')).toBe('https://sql.js.org/dist/sql-wasm.wasm');
      expect(config.locateFile('sql-wasm.wasm')).toBe('https://sql.js.org/dist/sql-wasm.wasm');
      expect(config.locateFile('custom.wasm')).toBe('https://sql.js.org/dist/custom.wasm');
    });

    it('uses window.location in locateFile when window is defined', async () => {
      const originalWindow = (globalThis as any).window;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline'));
      (globalThis as any).window = {
        location: {
          origin: 'http://localhost:8081',
          pathname: '/vigil/preview/',
        },
      };

      try {
        const config = await getWebSqlJsConfig();
        expect(config.locateFile('sql-wasm-browser.wasm')).toBe('http://localhost:8081/vigil/preview/sql-wasm.wasm');
        expect(config.locateFile('sql-wasm.wasm')).toBe('http://localhost:8081/vigil/preview/sql-wasm.wasm');
      } finally {
        (globalThis as any).window = originalWindow;
        globalThis.fetch = originalFetch;
      }
    });

    it('populates wasmBinary when fetch returns valid WASM magic bytes', async () => {
      const originalFetch = globalThis.fetch;
      // Valid WASM header: 0x00, 0x61, 0x73, 0x6d ('\0asm')
      const mockWasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

      globalThis.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url === '/sql-wasm-browser.wasm') {
          return {
            ok: true,
            headers: {
              get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/wasm' : null),
            },
            arrayBuffer: async () => mockWasmBytes.buffer,
          } as any;
        }
        return { ok: false } as any;
      });

      try {
        const config = await getWebSqlJsConfig();
        expect(config.wasmBinary).toBeDefined();
        const bytes = new Uint8Array(config.wasmBinary);
        expect(bytes[0]).toBe(0x00);
        expect(bytes[1]).toBe(0x61);
        expect(bytes[2]).toBe(0x73);
        expect(bytes[3]).toBe(0x6d);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('rejects text/html responses (Metro SPA fallback) and falls through to valid candidates', async () => {
      const originalFetch = globalThis.fetch;
      const htmlBytes = new TextEncoder().encode('<!DOCTYPE html><html><body>Metro</body></html>');
      const validWasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

      globalThis.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url === '/sql-wasm-browser.wasm') {
          // Simulating Metro returning index.html for missing static files
          return {
            ok: true,
            headers: {
              get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null),
            },
            arrayBuffer: async () => htmlBytes.buffer,
          } as any;
        }
        if (url === 'https://sql.js.org/dist/sql-wasm.wasm') {
          return {
            ok: true,
            headers: {
              get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/wasm' : null),
            },
            arrayBuffer: async () => validWasmBytes.buffer,
          } as any;
        }
        return { ok: false } as any;
      });

      try {
        const config = await getWebSqlJsConfig();
        expect(config.wasmBinary).toBeDefined();
        const bytes = new Uint8Array(config.wasmBinary);
        expect(bytes[0]).toBe(0x00);
        expect(bytes[1]).toBe(0x61);
        expect(bytes[2]).toBe(0x73);
        expect(bytes[3]).toBe(0x6d);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles fetch network errors gracefully without crashing', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      try {
        const config = await getWebSqlJsConfig();
        expect(config).toBeDefined();
        expect(config.locateFile).toBeDefined();
        expect(config.wasmBinary).toBeUndefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles timeout/abort gracefully during candidate fetch', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn().mockImplementation(async (_url: string, opts?: any) => {
        if (opts?.signal?.aborted) {
          throw new Error('The operation was aborted');
        }
        throw new Error('Timeout simulation');
      });

      try {
        const config = await getWebSqlJsConfig();
        expect(config).toBeDefined();
        expect(config.wasmBinary).toBeUndefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('loadSqlJsEngine', () => {
    it('loads standard SQL engine when available', async () => {
      const SQL = await loadSqlJsEngine();
      expect(SQL).toBeDefined();
      expect(SQL.Database).toBeDefined();
      const db = new SQL.Database();
      expect(db).toBeDefined();
      db.close();
    });

    it('falls back to ASM.js engine when WebAssembly engine throws', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const failingLoader = jest.fn().mockRejectedValue(new Error('WASM compile error: MIME type mismatch'));

      try {
        const SQL = await loadSqlJsEngine(undefined, failingLoader);
        expect(SQL).toBeDefined();
        expect(SQL.Database).toBeDefined();
        const db = new SQL.Database();
        db.run('CREATE TABLE fallback_test (id INT);');
        const res = db.exec('SELECT 100 AS num;');
        expect(res[0].values[0][0]).toBe(100);
        db.close();
        expect(warnSpy).toHaveBeenCalled();
        expect(failingLoader).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('SqlJsAdapter operations', () => {
    let adapter: SqlJsAdapter;

    beforeEach(async () => {
      adapter = await SqlJsAdapter.create();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('executes DDL, INSERT with insertId, and SELECT queries', async () => {
      await adapter.executeSql(`
        CREATE TABLE items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER NOT NULL
        );
      `);

      const insertRes1 = await adapter.executeSql(
        `INSERT INTO items (name, value) VALUES (?, ?);`,
        ['Item Alpha', 100]
      );
      expect(insertRes1.rowsAffected).toBe(1);
      expect(insertRes1.insertId).toBe(1);

      const insertRes2 = await adapter.executeSql(
        `INSERT INTO items (name, value) VALUES (?, ?);`,
        ['Item Beta', 200]
      );
      expect(insertRes2.rowsAffected).toBe(1);
      expect(insertRes2.insertId).toBe(2);

      const selectRes = await adapter.executeSql(`SELECT * FROM items ORDER BY id ASC;`);
      expect(selectRes.rows).toHaveLength(2);
      expect(selectRes.rows[0]).toEqual({ id: 1, name: 'Item Alpha', value: 100 });
      expect(selectRes.rows[1]).toEqual({ id: 2, name: 'Item Beta', value: 200 });
    });

    it('handles transactions with commit and rollback', async () => {
      await adapter.executeSql(`CREATE TABLE balance (id TEXT PRIMARY KEY, amount INTEGER);`);
      await adapter.executeSql(`INSERT INTO balance VALUES ('acc1', 500);`);

      // Successful transaction
      await adapter.transaction(async (tx) => {
        await tx.executeSql(`UPDATE balance SET amount = 600 WHERE id = 'acc1';`);
      });

      let res = await adapter.executeSql(`SELECT amount FROM balance WHERE id = 'acc1';`);
      expect(res.rows[0].amount).toBe(600);

      // Failed transaction rolled back
      await expect(
        adapter.transaction(async (tx) => {
          await tx.executeSql(`UPDATE balance SET amount = 999 WHERE id = 'acc1';`);
          throw new Error('Simulated abort');
        })
      ).rejects.toThrow('Simulated abort');

      res = await adapter.executeSql(`SELECT amount FROM balance WHERE id = 'acc1';`);
      expect(res.rows[0].amount).toBe(600);
    });

    it('creates database adapter when wasmBinary is provided', async () => {
      const fs = require('fs');
      const wasmBinary = fs.readFileSync('public/sql-wasm.wasm');
      const browserAdapter = await SqlJsAdapter.create({ wasmBinary: wasmBinary.buffer });
      expect(browserAdapter).toBeDefined();
      const res = await browserAdapter.executeSql('SELECT 1 + 1 AS sum;');
      expect(res.rows[0].sum).toBe(2);
      await browserAdapter.close();
    });

    it('creates database adapter in simulated browser environment (window defined)', async () => {
      const fs = require('fs');
      const wasmBinary = fs.readFileSync('public/sql-wasm.wasm');
      const originalWindow = (globalThis as any).window;
      const originalFetch = globalThis.fetch;

      (globalThis as any).window = {
        location: {
          origin: 'http://localhost:8081',
          pathname: '/',
        },
      };

      globalThis.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('sql-wasm')) {
          return {
            ok: true,
            headers: {
              get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/wasm' : null),
            },
            arrayBuffer: async () => wasmBinary.buffer.slice(0),
          } as any;
        }
        return { ok: false } as any;
      });

      try {
        const webAdapter = await SqlJsAdapter.create();
        expect(webAdapter).toBeDefined();
        const res = await webAdapter.executeSql('SELECT 42 AS answer;');
        expect(res.rows[0].answer).toBe(42);
        await webAdapter.close();
      } finally {
        (globalThis as any).window = originalWindow;
        globalThis.fetch = originalFetch;
      }
    });

    it('creates database adapter via ASM.js fallback when WASM initialization fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const failingLoader = jest.fn().mockRejectedValue(new Error('WASM instantiation failed'));

      try {
        const fallbackAdapter = await SqlJsAdapter.create(undefined, failingLoader);
        expect(fallbackAdapter).toBeDefined();
        const res = await fallbackAdapter.executeSql('SELECT 77 AS lucky;');
        expect(res.rows[0].lucky).toBe(77);
        await fallbackAdapter.close();
        expect(warnSpy).toHaveBeenCalled();
        expect(failingLoader).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('throws DATABASE_CLOSED after close() is called', async () => {
      await adapter.close();
      await expect(adapter.executeSql('SELECT 1;')).rejects.toThrow('DATABASE_CLOSED');
    });

    it('persists browser data across adapter recreation', async () => {
      const values = new Map<string, string>();
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
        removeItem: (key: string) => void values.delete(key),
      };

      const first = await SqlJsAdapter.createPersistent('test-vigil-db', storage);
      await first.executeSql('CREATE TABLE durable_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL);');
      await first.executeSql('INSERT INTO durable_items (id, name) VALUES (?, ?);', [1, 'Prayer']);
      await first.close();

      const reopened = await SqlJsAdapter.createPersistent('test-vigil-db', storage);
      const result = await reopened.executeSql('SELECT name FROM durable_items WHERE id = 1;');
      expect(result.rows).toEqual([{ name: 'Prayer' }]);
      await reopened.close();
    });
  });

  describe('getDatabase concurrent deduplication', () => {
    beforeEach(() => {
      resetDatabaseForTesting();
    });

    afterEach(() => {
      resetDatabaseForTesting();
    });

    it('deduplicates concurrent getDatabase calls and shares the same instance', async () => {
      // Fire 3 simultaneous getDatabase calls
      const [res1, res2, res3] = await Promise.all([
        getDatabase(),
        getDatabase(),
        getDatabase(),
      ]);

      expect(res1.db).toBe(res2.db);
      expect(res2.db).toBe(res3.db);
      expect(res1.repo).toBe(res2.repo);
      expect(res1.timeEngine).toBe(res2.timeEngine);

      // Verify that data written through one is visible to all
      const cats = await res1.repo.getCategories();
      expect(cats.length).toBeGreaterThan(0);
    });
  });
});
