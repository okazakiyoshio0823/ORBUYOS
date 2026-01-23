-- ORBIYOS Database Schema
-- 汎用業務支援システム

-- ユーザー/作業者
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'worker',  -- admin, manager, worker
  industry TEXT NOT NULL,      -- demolition, auto_repair
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

-- 車両（解体業: 解体対象車両 / 整備業: 整備対象車両）
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  plate_number TEXT,
  maker TEXT,
  model TEXT,
  model_code TEXT,           -- 型式
  year INTEGER,
  color TEXT,
  vin TEXT,                  -- 車台番号
  received_date DATE,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed
  industry TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 部品マスタ（解体業用）
CREATE TABLE IF NOT EXISTS parts_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,             -- engine, exterior, interior, etc.
  default_minutes INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 車種別部品（型式ごとの部品と作業時間）
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

-- 整備メニューマスタ（整備業用）
CREATE TABLE IF NOT EXISTS service_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,             -- inspection, maintenance, repair
  default_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT '#4CAF50',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 作業予定（解体業/整備業共通）
CREATE TABLE IF NOT EXISTS work_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_date DATE NOT NULL,
  worker_id INTEGER NOT NULL,
  vehicle_id INTEGER,
  customer_id INTEGER,
  
  -- 解体業の場合
  part_id INTEGER,
  
  -- 整備業の場合
  service_id INTEGER,
  
  -- 共通
  title TEXT,
  planned_start TIME,
  planned_end TIME,
  planned_minutes INTEGER,
  actual_start TIME,
  actual_end TIME,
  actual_minutes INTEGER,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, paused
  notes TEXT,
  industry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (part_id) REFERENCES parts_master(id),
  FOREIGN KEY (service_id) REFERENCES service_menus(id)
);

-- 作業者別実績（学習用）
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
