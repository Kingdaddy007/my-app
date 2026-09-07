import * as SQLite from 'expo-sqlite';
import { IDatabaseAdapter, QueryResult } from './dbAdapter';

export class ExpoSqliteAdapter implements IDatabaseAdapter {
  private db: any = null;

  static async create(databaseName: string = 'vigil.db'): Promise<IDatabaseAdapter> {
    const db = await SQLite.openDatabaseAsync(databaseName);
    return new ExpoSqliteAdapter(db);
  }

  constructor(db: any) {
    this.db = db;
  }

  async executeSql(sql: string, params: any[] = []): Promise<QueryResult> {
    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA');

    if (isSelect) {
      const rows = await this.db.getAllAsync(sql, params);
      return {
        rows: rows ?? [],
        rowsAffected: rows?.length ?? 0,
      };
    } else {
      const result = await this.db.runAsync(sql, params);
      return {
        rows: [],
        rowsAffected: result.changes ?? 0,
        insertId: result.lastInsertRowId,
      };
    }
  }

  async transaction<T>(action: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    let result: T;
    await this.db.withTransactionAsync(async () => {
      result = await action(this);
    });
    return result!;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
