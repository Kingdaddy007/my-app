import * as SQLite from 'expo-sqlite';
import { IDatabaseAdapter, QueryResult } from './dbAdapter';

export class ExpoSqliteAdapter implements IDatabaseAdapter {
  private db: any = null;
  private activeTransaction: any = null;

  static async create(databaseName: string = 'vigil.db'): Promise<IDatabaseAdapter> {
    const db = await SQLite.openDatabaseAsync(databaseName);
    return new ExpoSqliteAdapter(db);
  }

  constructor(db: any) {
    this.db = db;
  }

  async executeSql(sql: string, params: any[] = []): Promise<QueryResult> {
    const connection = this.activeTransaction ?? this.db;
    if (!connection) throw new Error('DATABASE_CLOSED');
    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA');

    if (isSelect) {
      const rows = await connection.getAllAsync(sql, params);
      return {
        rows: rows ?? [],
        rowsAffected: rows?.length ?? 0,
      };
    } else {
      const result = await connection.runAsync(sql, params);
      return {
        rows: [],
        rowsAffected: result.changes ?? 0,
        insertId: result.lastInsertRowId,
      };
    }
  }

  async transaction<T>(action: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('DATABASE_CLOSED');
    if (this.activeTransaction) return action(this);
    let result!: T;
    await this.db.withExclusiveTransactionAsync(async (transaction: any) => {
      this.activeTransaction = transaction;
      try {
        result = await action(this);
      } finally {
        this.activeTransaction = null;
      }
    });
    return result;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
