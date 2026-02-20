import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// データベースファイルのパス
const DB_PATH = process.env.VERCEL
  ? '/tmp/orbiyos.db'
  : path.join(process.cwd(), 'database', 'orbiyos.db');

// データベースディレクトリの作成（ローカル環境用）
if (!process.env.VERCEL) {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// データベーススキーマ（埋め込み）
const SCHEMA_SQL = `
-- ORBIYOS Database Schema
-- ユーザー/作業者
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'worker',
  industry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 顧客
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

-- 車両
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

-- 部品マスタ
CREATE TABLE IF NOT EXISTS parts_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  default_minutes INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 車種別部品
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

-- 整備メニューマスタ
CREATE TABLE IF NOT EXISTS service_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  default_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT '#4CAF50',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 作業予定
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
  industry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (part_id) REFERENCES parts_master(id),
  FOREIGN KEY (service_id) REFERENCES service_menus(id)
);

-- 実績
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

-- 初期データ: 作業者
INSERT OR IGNORE INTO workers (id, name, role, industry) VALUES
(1, '山田 太郎', 'worker', 'demolition'),
(2, '佐藤 次郎', 'worker', 'demolition'),
(3, '田中 三郎', 'worker', 'demolition'),
(4, '鈴木 健太', 'worker', 'auto_repair'),
(5, '高橋 修', 'worker', 'auto_repair'),
(6, '渡辺 勇', 'worker', 'auto_repair'),
(7, '伊藤 誠', 'worker', 'auto_repair');

-- 初期データ: 部品マスタ
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

-- 初期データ: 整備メニュー
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

// データベース接続（シングルトン）
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

// データベース初期化
function initializeDatabase() {
  const database = db!;
  database.exec(SCHEMA_SQL);
}

// 共通のCRUD操作
export function findAll<T>(table: string, where?: Record<string, unknown>): T[] {
  const database = getDatabase();
  let sql = `SELECT * FROM ${table}`;
  const params: unknown[] = [];

  if (where && Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map(key => {
      params.push(where[key]);
      return `${key} = ?`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return database.prepare(sql).all(...params) as T[];
}

export function findById<T>(table: string, id: number): T | undefined {
  const database = getDatabase();
  return database.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as T | undefined;
}

export function insert(table: string, data: Record<string, unknown>): number {
  const database = getDatabase();
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = database.prepare(sql).run(...Object.values(data));
  return result.lastInsertRowid as number;
}

export function update(table: string, id: number, data: Record<string, unknown>): void {
  const database = getDatabase();
  const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`;
  database.prepare(sql).run(...Object.values(data), id);
}

export function remove(table: string, id: number): void {
  const database = getDatabase();
  database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

// 日付でフィルタしたスケジュール取得
export function getSchedulesByDate(date: string, industry: string) {
  const database = getDatabase();
  return database.prepare(`
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
      sm.color as service_color
    FROM work_schedules ws
    LEFT JOIN workers w ON ws.worker_id = w.id
    LEFT JOIN vehicles v ON ws.vehicle_id = v.id
    LEFT JOIN customers c ON ws.customer_id = c.id
    LEFT JOIN parts_master pm ON ws.part_id = pm.id
    LEFT JOIN service_menus sm ON ws.service_id = sm.id
    WHERE ws.work_date = ? AND ws.industry = ?
    ORDER BY w.name, ws.planned_start
  `).all(date, industry);
}

// 汎用的なスケジュール取得（industry省略時は全件）
export function getSchedules(date: string, industry?: string) {
  const database = getDatabase();
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
      sm.color as service_color
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

  return database.prepare(sql).all(...params);
}

// 作業者別のスケジュール取得
export function getSchedulesByWorker(workerId: number, date: string) {
  const database = getDatabase();
  return database.prepare(`
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
  `).all(workerId, date);
}

// 作業完了時の実績更新
export function updateWorkPerformance(
  workerId: number,
  modelCode: string | null,
  partId: number | null,
  serviceId: number | null,
  actualMinutes: number
) {
  const database = getDatabase();

  // 既存レコードの検索
  const existing = database.prepare(`
    SELECT * FROM worker_performance 
    WHERE worker_id = ? 
    AND (model_code = ? OR (model_code IS NULL AND ? IS NULL))
    AND (part_id = ? OR (part_id IS NULL AND ? IS NULL))
    AND (service_id = ? OR (service_id IS NULL AND ? IS NULL))
  `).get(workerId, modelCode, modelCode, partId, partId, serviceId, serviceId) as {
    id: number;
    total_count: number;
    total_minutes: number;
  } | undefined;

  if (existing) {
    const newCount = existing.total_count + 1;
    const newTotal = existing.total_minutes + actualMinutes;
    const newAvg = Math.round(newTotal / newCount);

    database.prepare(`
      UPDATE worker_performance 
      SET total_count = ?, total_minutes = ?, avg_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newCount, newTotal, newAvg, existing.id);
  } else {
    database.prepare(`
      INSERT INTO worker_performance (worker_id, model_code, part_id, service_id, avg_minutes, total_count, total_minutes)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(workerId, modelCode, partId, serviceId, actualMinutes, actualMinutes);
  }
}
