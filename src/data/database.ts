import { IDatabaseAdapter } from './dbAdapter';
import { ExpoSqliteAdapter } from './sqliteAdapter';
import { initializeDatabase } from './schema';
import { Repository } from './repository';
import { TimeEngine } from '../domain/timeEngine';
import { SystemClock } from '../domain/clock';

let dbInstance: IDatabaseAdapter | null = null;
let repoInstance: Repository | null = null;
let timeEngineInstance: TimeEngine | null = null;

export async function getDatabase(): Promise<{
  db: IDatabaseAdapter;
  repo: Repository;
  timeEngine: TimeEngine;
}> {
  if (!dbInstance || !repoInstance || !timeEngineInstance) {
    dbInstance = await ExpoSqliteAdapter.create('vigil.db');
    await initializeDatabase(dbInstance);
    repoInstance = new Repository(dbInstance);
    timeEngineInstance = new TimeEngine(dbInstance, repoInstance, new SystemClock());
  }

  return {
    db: dbInstance,
    repo: repoInstance,
    timeEngine: timeEngineInstance,
  };
}
