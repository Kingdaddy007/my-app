import { IDatabaseAdapter } from './dbAdapter';
import { ExpoSqliteAdapter } from './sqliteAdapter';
import { initializeDatabase } from './schema';
import { Repository } from './repository';
import { TimeEngine } from '../domain/timeEngine';
import { SystemClock } from '../domain/clock';

let dbInstance: IDatabaseAdapter | null = null;
let repoInstance: Repository | null = null;
let timeEngineInstance: TimeEngine | null = null;
let initPromise: Promise<{
  db: IDatabaseAdapter;
  repo: Repository;
  timeEngine: TimeEngine;
}> | null = null;

export async function getDatabase(): Promise<{
  db: IDatabaseAdapter;
  repo: Repository;
  timeEngine: TimeEngine;
}> {
  if (dbInstance && repoInstance && timeEngineInstance) {
    return {
      db: dbInstance,
      repo: repoInstance,
      timeEngine: timeEngineInstance,
    };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await ExpoSqliteAdapter.create('vigil.db');
      await initializeDatabase(db);
      const repo = new Repository(db);
      const timeEngine = new TimeEngine(db, repo, new SystemClock());

      dbInstance = db;
      repoInstance = repo;
      timeEngineInstance = timeEngine;

      return {
        db: dbInstance,
        repo: repoInstance,
        timeEngine: timeEngineInstance,
      };
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function resetDatabaseForTesting(): void {
  dbInstance = null;
  repoInstance = null;
  timeEngineInstance = null;
  initPromise = null;
}
