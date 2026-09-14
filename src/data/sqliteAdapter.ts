import { IDatabaseAdapter } from './dbAdapter';
import { SqlJsAdapter } from './sqlJsAdapter';

type ExpoRunResult = { changes: number; lastInsertRowId: number };
type ExpoSqliteConnection = {
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  runAsync(sql: string, params?: any[]): Promise<ExpoRunResult>;
  withExclusiveTransactionAsync<T>(action: (tx: ExpoSqliteConnection) => Promise<T>): Promise<T>;
  closeAsync(): Promise<void>;
};

class NativeSqliteAdapter implements IDatabaseAdapter {
  private activeTransaction: ExpoSqliteConnection | null = null;

  constructor(private connection: ExpoSqliteConnection | null) {}

  async executeSql(sql: string, params: any[] = []) {
    const connection = this.activeTransaction ?? this.connection;
    if (!connection) throw new Error('DATABASE_CLOSED');
    const normalized = sql.trim().toUpperCase();
    const readsRows = normalized.startsWith('SELECT') || normalized.startsWith('PRAGMA');
    if (readsRows) {
      const rows = await connection.getAllAsync(sql, params);
      return { rows, rowsAffected: rows.length };
    }
    const result = await connection.runAsync(sql, params);
    return {
      rows: [],
      rowsAffected: result.changes,
      insertId: result.lastInsertRowId > 0 ? result.lastInsertRowId : undefined,
    };
  }

  async transaction<T>(action: (tx: IDatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.connection) throw new Error('DATABASE_CLOSED');
    if (this.activeTransaction) return action(this);

    let value!: T;
    await this.connection.withExclusiveTransactionAsync(async (transaction) => {
      this.activeTransaction = transaction;
      try {
        value = await action(this);
      } finally {
        this.activeTransaction = null;
      }
    });
    return value;
  }

  async close(): Promise<void> {
    if (!this.connection) return;
    await this.connection.closeAsync();
    this.connection = null;
  }
}

export class ExpoSqliteAdapter {
  static async create(databaseName: string = 'vigil.db'): Promise<IDatabaseAdapter> {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return SqlJsAdapter.create();
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return SqlJsAdapter.createPersistent(`vigil.sqlite.${databaseName}`);
    }

    const SQLite = await import('expo-sqlite');
    const connection = (await SQLite.openDatabaseAsync(databaseName)) as unknown as ExpoSqliteConnection;
    return new NativeSqliteAdapter(connection);
  }
}
