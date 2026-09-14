declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string): Array<{ columns: string[]; values: any[][] }>;
    prepare(sql: string): Statement;
    close(): void;
  }

  export interface Statement {
    bind(values?: any[]): boolean;
    step(): boolean;
    get(): any[];
    getAsObject(): any;
    free(): void;
  }

  export type SqlValue = number | string | Uint8Array | null;

  export default function initSqlJs(config?: any): Promise<{
    Database: new (data?: ArrayBuffer | Uint8Array) => Database;
  }>;
}

declare module 'sql.js/dist/sql-asm.js' {
  import initSqlJs from 'sql.js';
  export default initSqlJs;
}
