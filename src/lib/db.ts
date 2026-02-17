import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// データベースファイルのパス
const DB_PATH = path.join(process.cwd(), 'database', 'orbiyos.db');

// データベースディレクトリの作成
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

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

  // スキーマの読み込みと実行
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    database.exec(schema);
  }
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
