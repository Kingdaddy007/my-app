import initSqlJs, { Database, SqlValue } from 'sql.js';
import { IDatabaseAdapter, QueryResult } from './dbAdapter';

export class SqlJsAdapter implements IDatabaseAdapter {
  private db: Database | null = null;
  private inTransaction = false;

  static async create(): Promise<SqlJsAdapter> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    return new SqlJsAdapter(db);
  }

  constructor(db: Database) {
    this.db = db;
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
      const rowsAffectedRes = this.db.exec('SELECT changes() AS changes;');
      const rowsAffected = (rowsAffectedRes[0]?.values[0]?.[0] as number) ?? 1;

      return {
        rows: [],
        rowsAffected,
      };
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
      this.db.close();
      this.db = null;
    }
  }
}
