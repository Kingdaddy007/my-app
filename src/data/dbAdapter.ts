/**
 * Database Adapter Interface
 * Common abstraction supporting Expo SQLite (native) and SQL.js (Node tests/web).
 */

export interface QueryResult {
  rows: any[];
  rowsAffected: number;
  insertId?: number;
}

export interface IDatabaseAdapter {
  executeSql(sql: string, params?: any[]): Promise<QueryResult>;
  transaction<T>(action: (tx: IDatabaseAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
