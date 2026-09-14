import { IDatabaseAdapter } from './dbAdapter';
import { SqlJsAdapter } from './sqlJsAdapter';

export class ExpoSqliteAdapter {
  static async create(databaseName: string = 'vigil.db'): Promise<IDatabaseAdapter> {
    return SqlJsAdapter.createPersistent(`aevia.sqlite.${databaseName}`);
  }
}
