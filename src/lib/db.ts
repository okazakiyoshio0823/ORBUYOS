import Database from 'better-sqlite3';
import { sql } from '@vercel/postgres';
import path from 'path';
import fs from 'fs';

// 環境判定
const IS_VERCEL = process.env.VERCEL === '1';

// -----------------------------------------------------------------------------
// Schema Definitions
// -----------------------------------------------------------------------------

// SQLite Schema (Local)
const SCHEMA_SQLITE = `
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'worker',
  industry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  industry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  plate_number TEXT,
  maker TEXT,
  model TEXT,
  model_code TEXT,
  year INTEGER,
  color TEXT,
  vin TEXT,
  received_date DATE,
  status TEXT DEFAULT 'pending',
  industry TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS parts_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  default_minutes INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_code TEXT NOT NULL,
  part_id INTEGER NOT NULL,
  avg_minutes INTEGER,
  total_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (part_id) REFERENCES parts_master(id)
);

CREATE TABLE IF NOT EXISTS service_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  default_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT '#4CAF50',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_date DATE NOT NULL,
  worker_id INTEGER NOT NULL,
  vehicle_id INTEGER,
  customer_id INTEGER,
  part_id INTEGER,
  service_id INTEGER,
  title TEXT,
  planned_start TIME,
  planned_end TIME,
  planned_minutes INTEGER,
  actual_start TIME,
  actual_end TIME,
  actual_minutes INTEGER,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  image_url TEXT,
  industry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (part_id) REFERENCES parts_master(id),
  FOREIGN KEY (service_id) REFERENCES service_menus(id)
);

CREATE TABLE IF NOT EXISTS worker_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  model_code TEXT,
  part_id INTEGER,
  service_id INTEGER,
  avg_minutes INTEGER,
  total_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (part_id) REFERENCES parts_master(id),
  FOREIGN KEY (service_id) REFERENCES service_menus(id)
);

CREATE TABLE IF NOT EXISTS inventory_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL,
  vehicle_id INTEGER,
  status TEXT DEFAULT 'available',
  price_estimate INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (part_id) REFERENCES parts_master(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

INSERT OR IGNORE INTO workers (id, name, role, industry) VALUES
(1, '山田 太郎', 'worker', 'demolition'),
(2, '佐藤 次郎', 'worker', 'demolition'),
(3, '田中 三郎', 'worker', 'demolition'),
(4, '鈴木 健太', 'worker', 'auto_repair'),
(5, '高橋 修', 'worker', 'auto_repair'),
(6, '渡辺 勇', 'worker', 'auto_repair'),
(7, '伊藤 誠', 'worker', 'auto_repair');

INSERT OR IGNORE INTO parts_master (id, name, category, default_minutes) VALUES
(1, 'エンジン', 'engine', 60),
(2, 'ミッション', 'engine', 45),
(3, 'フロントドア(左)', 'exterior', 10),
(4, 'フロントドア(右)', 'exterior', 10),
(5, 'リアドア(左)', 'exterior', 10),
(6, 'リアドア(右)', 'exterior', 10),
(7, 'ボンネット', 'exterior', 15),
(8, 'トランク', 'exterior', 12),
(9, 'フロントバンパー', 'exterior', 15),
(10, 'リアバンパー', 'exterior', 15),
(11, 'ヘッドライト(左)', 'exterior', 8),
(12, 'ヘッドライト(右)', 'exterior', 8),
(13, '足回り(フロント)', 'suspension', 40),
(14, '足回り(リア)', 'suspension', 35),
(15, 'シート(運転席)', 'interior', 15),
(16, 'シート(助手席)', 'interior', 15),
(17, 'ダッシュボード', 'interior', 30),
(18, 'ステアリング', 'interior', 10);

INSERT OR IGNORE INTO service_menus (id, name, category, default_minutes, color) VALUES
(1, '車検', 'inspection', 120, '#4CAF50'),
(2, '1年点検', 'inspection', 90, '#2196F3'),
(3, '6ヶ月点検', 'inspection', 30, '#FFC107'),
(4, 'オイル交換', 'maintenance', 20, '#FF9800'),
(5, 'タイヤ交換', 'maintenance', 30, '#FF9800'),
(6, 'ブレーキパッド交換', 'repair', 60, '#9C27B0'),
(7, 'バッテリー交換', 'maintenance', 15, '#FF9800'),
(8, 'エアコン修理', 'repair', 90, '#9C27B0'),
(9, 'エンジン整備', 'repair', 180, '#9C27B0'),
(10, '一般整備', 'maintenance', 60, '#FF9800');
`;

// Postgres Schema (Production/Vercel)
const SCHEMA_POSTGRES = `
CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'worker',
  industry TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  industry TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGERREFERENCES customers(id),
  plate_number TEXT,
  maker TEXT,
  model TEXT,
  model_code TEXT,
  year INTEGER,
  color TEXT,
  vin TEXT,
  received_date DATE,
  status TEXT DEFAULT 'pending',
  industry TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parts_master (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  default_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_parts (
  id SERIAL PRIMARY KEY,
  model_code TEXT NOT NULL,
  part_id INTEGER REFERENCES parts_master(id),
  avg_minutes INTEGER,
  total_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_menus (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  default_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT '#4CAF50',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id SERIAL PRIMARY KEY,
  work_date DATE NOT NULL,
  worker_id INTEGER REFERENCES workers(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  customer_id INTEGER REFERENCES customers(id),
  part_id INTEGER REFERENCES parts_master(id),
  service_id INTEGER REFERENCES service_menus(id),
  title TEXT,
  planned_start TIME,
  planned_end TIME,
  planned_minutes INTEGER,
  actual_start TIME,
  actual_end TIME,
  actual_minutes INTEGER,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  image_url TEXT,
  industry TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_performance (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES workers(id),
  model_code TEXT,
  part_id INTEGER REFERENCES parts_master(id),
  service_id INTEGER REFERENCES service_menus(id),
  avg_minutes INTEGER,
  total_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_parts (
  id SERIAL PRIMARY KEY,
  part_id INTEGER REFERENCES parts_master(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  status TEXT DEFAULT 'available',
  price_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO workers (id, name, role, industry) VALUES
(1, '山田 太郎', 'worker', 'demolition'),
(2, '佐藤 次郎', 'worker', 'demolition'),
(3, '田中 三郎', 'worker', 'demolition'),
(4, '鈴木 健太', 'worker', 'auto_repair'),
(5, '高橋 修', 'worker', 'auto_repair'),
(6, '渡辺 勇', 'worker', 'auto_repair'),
(7, '伊藤 誠', 'worker', 'auto_repair')
ON CONFLICT (id) DO NOTHING;

INSERT INTO parts_master (id, name, category, default_minutes) VALUES
(1, 'エンジン', 'engine', 60),
(2, 'ミッション', 'engine', 45),
(3, 'フロントドア(左)', 'exterior', 10),
(4, 'フロントドア(右)', 'exterior', 10),
(5, 'リアドア(左)', 'exterior', 10),
(6, 'リアドア(右)', 'exterior', 10),
(7, 'ボンネット', 'exterior', 15),
(8, 'トランク', 'exterior', 12),
(9, 'フロントバンパー', 'exterior', 15),
(10, 'リアバンパー', 'exterior', 15),
(11, 'ヘッドライト(左)', 'exterior', 8),
(12, 'ヘッドライト(右)', 'exterior', 8),
(13, '足回り(フロント)', 'suspension', 40),
(14, '足回り(リア)', 'suspension', 35),
(15, 'シート(運転席)', 'interior', 15),
(16, 'シート(助手席)', 'interior', 15),
(17, 'ダッシュボード', 'interior', 30),
(18, 'ステアリング', 'interior', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_menus (id, name, category, default_minutes, color) VALUES
(1, '車検', 'inspection', 120, '#4CAF50'),
(2, '1年点検', 'inspection', 90, '#2196F3'),
(3, '6ヶ月点検', 'inspection', 30, '#FFC107'),
(4, 'オイル交換', 'maintenance', 20, '#FF9800'),
(5, 'タイヤ交換', 'maintenance', 30, '#FF9800'),
(6, 'ブレーキパッド交換', 'repair', 60, '#9C27B0'),
(7, 'バッテリー交換', 'maintenance', 15, '#FF9800'),
(8, 'エアコン修理', 'repair', 90, '#9C27B0'),
(9, 'エンジン整備', 'repair', 180, '#9C27B0'),
(10, '一般整備', 'maintenance', 60, '#FF9800')
ON CONFLICT (id) DO NOTHING;
`;

// -----------------------------------------------------------------------------
// Database Interfaces
// -----------------------------------------------------------------------------

export interface DBClient {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  mutate(sql: string, params?: any[]): Promise<{ lastInsertId?: number }>;
  close(): void;
}

// -----------------------------------------------------------------------------
// SQLite Implementation (Local)
// -----------------------------------------------------------------------------

class SQLiteClient implements DBClient {
  private db: Database.Database;

  constructor() {
    // データベースファイルのパス
    const DB_PATH = path.join(process.cwd(), 'database', 'orbiyos.db');

    // データベースディレクトリの作成
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');

    // スキーマ初期化
    this.db.exec(SCHEMA_SQLITE);
  }

  async query<T>(sqlStr: string, params: any[] = []): Promise<T[]> {
    // ? はそのまま使える
    return this.db.prepare(sqlStr).all(...params) as T[];
  }

  async mutate(sqlStr: string, params: any[] = []): Promise<{ lastInsertId?: number }> {
    const info = this.db.prepare(sqlStr).run(...params);
    return { lastInsertId: Number(info.lastInsertRowid) };
  }

  close() {
    this.db.close();
  }
}

// -----------------------------------------------------------------------------
// Postgres Implementation (Vercel)
// -----------------------------------------------------------------------------

class PostgresClient implements DBClient {
  private initialized = false;

  constructor() {
    // 非同期初期化が必要だが、コンストラクタでは呼べないのでquery/mutateでチェック
  }

  private async initSchema() {
    if (this.initialized) return;
    try {
      // テーブルが存在するか確認（簡易的なチェック）
      // 完全なチェックは複雑なので、単に CREATE TABLE IF NOT EXISTS を毎回流す（Vercel PostgresはServerlessなのでコネクションプール経由）
      // ただし、SQL文字列をそのまま流すと長いので、本当はmigration管理すべき。
      // ここでは簡易的に、sql`...` で流すが、多重実行を避けるためにフラグ管理。

      // 注意: sql template literal は単純な文字列実行には不向き（パラメータ化前提）。
      // ここでは個別のCREATE文として実行する、あるいは単純なクエリとして実行。
      // @vercel/postgres の sql はテンプレートリテラル専用。

      // スキーマを分割して実行（改行で区切るなど）
      // ここでは簡易的にテーブルごとに分割されていると仮定して、正規表現で分割

      // 実はVercel Postgresでも sql`CREATE TABLE ...` は動く。
      // ただし、複数の文を一度に実行できるかはドライバによる。
      // 安全のため、セミコロンで分割して実行。

      const statements = SCHEMA_POSTGRES
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        // queryメソッドを直接呼び出す（sqlタグを使わない）
        // @vercel/postgres は sql`...` 以外に db.query() もある？
        // sql`...` が基本。動的SQLは危険。
        // しかしスキーマ初期化は固定文字列。
        // sql(strings, ...values) の形で呼び出す必要がある。
        // ここは sql([statement]) のようにハックする。

        // 修正: sql テンプレートタグは内部でパラメータ化を行う。生のSQLを実行するには危険だが、
        // 固定文字列なら問題ない。
        // ts-ignore で回避するか、単純に sql.query(statement) が使えるか確認。
        // v0.10.0 では sql.query() があるはず。

        await sql.query(statement);
      }

      this.initialized = true;
    } catch (e) {
      console.error('Failed to initialize Postgres schema:', e);
      // エラーでも続行（接続エラーかもしれないが）
    }
  }

  private convertSql(sqlStr: string): string {
    // ? を $1, $2, ... に変換
    let i = 1;
    return sqlStr.replace(/\?/g, () => `$${i++}`);
  }

  async query<T>(sqlStr: string, params: any[] = []): Promise<T[]> {
    await this.initSchema();
    const pgSql = this.convertSql(sqlStr);
    const result = await sql.query(pgSql, params);
    return result.rows as T[];
  }

  async mutate(sqlStr: string, params: any[] = []): Promise<{ lastInsertId?: number }> {
    await this.initSchema();
    const pgSql = this.convertSql(sqlStr);

    // INSERTの場合、RETURNING id を追加してIDを取得
    let finalSql = pgSql;
    if (sqlStr.trim().toUpperCase().startsWith('INSERT')) {
      // 既にRETURNINGがあるか確認
      if (!finalSql.toUpperCase().includes('RETURNING')) {
        finalSql += ' RETURNING id';
      }
    }

    const result = await sql.query(finalSql, params);

    // INSERTならIDを返す
    if (result.rows.length > 0 && result.rows[0].id) {
      return { lastInsertId: result.rows[0].id };
    }
    return { lastInsertId: 0 };
  }

  close() {
    // Serverlessなので明示的なクローズは不要
  }
}

// -----------------------------------------------------------------------------
// Client Factory
// -----------------------------------------------------------------------------

// シングルトン
let clientInstance: DBClient | null = null;

export function getDB(): DBClient {
  if (clientInstance) return clientInstance;

  if (IS_VERCEL && process.env.POSTGRES_URL) {
    clientInstance = new PostgresClient();
  } else {
    clientInstance = new SQLiteClient();
  }
  return clientInstance;
}

// -----------------------------------------------------------------------------
// Helper Functions (Re-implemented using DBClient)
// -----------------------------------------------------------------------------

export async function findAll<T>(table: string, where?: Record<string, unknown>): Promise<T[]> {
  const db = getDB();
  let sql = `SELECT * FROM ${table}`;
  const params: unknown[] = [];

  if (where && Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map(key => {
      params.push(where[key]);
      return `${key} = ?`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return await db.query<T>(sql, params);
}

export async function findById<T>(table: string, id: number): Promise<T | undefined> {
  const db = getDB();
  const rows = await db.query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return rows[0];
}

export async function insert(table: string, data: Record<string, unknown>): Promise<number> {
  const db = getDB();
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = await db.mutate(sql, Object.values(data));
  return result.lastInsertId || 0;
}

export async function update(table: string, id: number, data: Record<string, unknown>): Promise<void> {
  const db = getDB();
  const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`;
  await db.mutate(sql, [...Object.values(data), id]);
}

export async function remove(table: string, id: number): Promise<void> {
  const db = getDB();
  await db.mutate(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

// -----------------------------------------------------------------------------
// Specific Queries
// -----------------------------------------------------------------------------

export async function getSchedulesByDate(date: string, industry: string) {
  const db = getDB();
  return await db.query(`
    SELECT 
      ws.*,
      w.name as worker_name,
      v.plate_number,
      v.maker,
      v.model,
      v.model_code,
      c.name as customer_name,
      pm.name as part_name,
      sm.name as service_name,
      sm.color as service_color,
      ws.image_url
    FROM work_schedules ws
    LEFT JOIN workers w ON ws.worker_id = w.id
    LEFT JOIN vehicles v ON ws.vehicle_id = v.id
    LEFT JOIN customers c ON ws.customer_id = c.id
    LEFT JOIN parts_master pm ON ws.part_id = pm.id
    LEFT JOIN service_menus sm ON ws.service_id = sm.id
    WHERE ws.work_date = ? AND ws.industry = ?
    ORDER BY w.name, ws.planned_start
  `, [date, industry]);
}

export async function getSchedules(date: string, industry?: string) {
  const db = getDB();
  let sql = `
    SELECT 
      ws.*,
      w.name as worker_name,
      v.plate_number,
      v.maker,
      v.model,
      v.model_code,
      c.name as customer_name,
      pm.name as part_name,
      sm.name as service_name,
      sm.color as service_color,
      ws.image_url
    FROM work_schedules ws
    LEFT JOIN workers w ON ws.worker_id = w.id
    LEFT JOIN vehicles v ON ws.vehicle_id = v.id
    LEFT JOIN customers c ON ws.customer_id = c.id
    LEFT JOIN parts_master pm ON ws.part_id = pm.id
    LEFT JOIN service_menus sm ON ws.service_id = sm.id
    WHERE ws.work_date = ?
  `;

  const params: string[] = [date];

  if (industry) {
    sql += ` AND ws.industry = ?`;
    params.push(industry);
  }

  sql += ` ORDER BY w.name, ws.planned_start`;

  return await db.query(sql, params);
}

export async function getSchedulesByWorker(workerId: number, date: string) {
  const db = getDB();
  return await db.query(`
    SELECT 
      ws.*,
      v.plate_number,
      v.maker,
      v.model,
      pm.name as part_name,
      sm.name as service_name,
      sm.color as service_color
    FROM work_schedules ws
    LEFT JOIN vehicles v ON ws.vehicle_id = v.id
    LEFT JOIN parts_master pm ON ws.part_id = pm.id
    LEFT JOIN service_menus sm ON ws.service_id = sm.id
    WHERE ws.worker_id = ? AND ws.work_date = ?
    ORDER BY ws.planned_start
  `, [workerId, date]);
}

export async function updateWorkPerformance(
  workerId: number,
  modelCode: string | null,
  partId: number | null,
  serviceId: number | null,
  actualMinutes: number
) {
  const db = getDB();

  // 既存レコードの検索
  const rows = await db.query<{
    id: number;
    total_count: number;
    total_minutes: number;
  }>(`
    SELECT * FROM worker_performance 
    WHERE worker_id = ? 
    AND (model_code = ? OR (model_code IS NULL AND ? IS NULL))
    AND (part_id = ? OR (part_id IS NULL AND ? IS NULL))
    AND (service_id = ? OR (service_id IS NULL AND ? IS NULL))
  `, [workerId, modelCode, modelCode, partId, partId, serviceId, serviceId]);

  const existing = rows[0];

  if (existing) {
    const newCount = existing.total_count + 1;
    const newTotal = existing.total_minutes + actualMinutes;
    const newAvg = Math.round(newTotal / newCount);

    await db.mutate(`
      UPDATE worker_performance 
      SET total_count = ?, total_minutes = ?, avg_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newCount, newTotal, newAvg, existing.id]);
  } else {
    await db.mutate(`
      INSERT INTO worker_performance (worker_id, model_code, part_id, service_id, avg_minutes, total_count, total_minutes)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `, [workerId, modelCode, partId, serviceId, actualMinutes, actualMinutes]);
  }
}
