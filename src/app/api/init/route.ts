import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// POST /api/init - データベース初期化（サンプルデータ投入）
export async function POST() {
    try {
        const db = getDB();

        // 既存データの確認
        const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM workers');
        const existingWorkers = rows[0];

        // Migration: Add image_url to work_schedules if it doesn't exist
        try {
            await db.mutate('ALTER TABLE work_schedules ADD COLUMN image_url TEXT');
            console.log('Migrated work_schedules: added image_url');
        } catch (e: any) {
            if (!e.message?.includes('duplicate column name')) {
                console.error('Migration error:', e);
            }
        }

        if (existingWorkers && existingWorkers.count > 0) {
            return NextResponse.json({
                success: true,
                message: 'Database already initialized',
                initialized: false
            });
        }

        // 作業者データ投入
        // Note: db.mutate returns a Promise, so we await each call.
        // Parallel execution is possible but sequential is safer for order.

        // 解体業の作業者
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['山田 太郎', 'worker', 'demolition']);
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['佐藤 次郎', 'worker', 'demolition']);
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['田中 三郎', 'worker', 'demolition']);

        // 整備業の作業者
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['鈴木 健太', 'worker', 'auto_repair']);
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['高橋 修', 'worker', 'auto_repair']);
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['渡辺 勇', 'worker', 'auto_repair']);
        await db.mutate('INSERT INTO workers (name, role, industry) VALUES (?, ?, ?)', ['伊藤 誠', 'worker', 'auto_repair']);

        // 本日のサンプルスケジュール
        const today = new Date().toISOString().split('T')[0];
        const scheduleSql = `
      INSERT INTO work_schedules 
      (work_date, worker_id, title, planned_start, planned_minutes, status, industry, part_id, service_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        // 解体業のスケジュール
        await db.mutate(scheduleSql, [today, 1, 'プリウス ZVW30 - エンジン', '08:00', 120, 'completed', 'demolition', 1, null]);
        await db.mutate(scheduleSql, [today, 1, 'ワゴンR MH23S - バンパー', '11:00', 90, 'in_progress', 'demolition', 9, null]);
        await db.mutate(scheduleSql, [today, 1, 'セレナ C26 - シート', '14:00', 90, 'pending', 'demolition', 15, null]);
        await db.mutate(scheduleSql, [today, 2, 'フィット GE6 - ドア', '08:00', 180, 'completed', 'demolition', 3, null]);
        await db.mutate(scheduleSql, [today, 2, 'カローラ NZE141 - ライト', '12:00', 120, 'pending', 'demolition', 11, null]);
        await db.mutate(scheduleSql, [today, 2, 'N-BOX JF1 - ホイール', '15:00', 60, 'pending', 'demolition', null, null]);
        await db.mutate(scheduleSql, [today, 3, 'アクア NHP10 - ミラー', '08:00', 90, 'completed', 'demolition', null, null]);
        await db.mutate(scheduleSql, [today, 3, 'ステップワゴン RK5 - グリル', '11:00', 150, 'in_progress', 'demolition', null, null]);
        await db.mutate(scheduleSql, [today, 3, 'タント L375S - 内装', '14:30', 120, 'pending', 'demolition', 17, null]);

        // 整備業のスケジュール
        await db.mutate(scheduleSql, [today, 4, '車検 - 品川 500 あ 1234', '09:00', 120, 'completed', 'auto_repair', null, 1]);
        await db.mutate(scheduleSql, [today, 4, '1年点検 - 品川 300 い 5678', '11:30', 90, 'in_progress', 'auto_repair', null, 2]);
        await db.mutate(scheduleSql, [today, 4, '6ヶ月点検 - 世田谷 500 う 9012', '14:00', 30, 'pending', 'auto_repair', null, 3]);
        await db.mutate(scheduleSql, [today, 4, 'オイル交換', '15:00', 60, 'pending', 'auto_repair', null, 4]);
        await db.mutate(scheduleSql, [today, 5, 'ブレーキ修理', '09:00', 150, 'completed', 'auto_repair', null, 6]);
        await db.mutate(scheduleSql, [today, 5, '車検 - 練馬 330 え 1111', '12:00', 120, 'in_progress', 'auto_repair', null, 1]);
        await db.mutate(scheduleSql, [today, 5, '6ヶ月点検 - 杉並 500 お 2222', '15:00', 30, 'pending', 'auto_repair', null, 3]);
        await db.mutate(scheduleSql, [today, 6, '1年点検 - 足立 200 か 3333', '09:00', 90, 'completed', 'auto_repair', null, 2]);
        await db.mutate(scheduleSql, [today, 6, 'タイヤ交換', '11:00', 60, 'completed', 'auto_repair', null, 5]);
        await db.mutate(scheduleSql, [today, 6, '車検 - 板橋 500 き 4444', '13:00', 120, 'in_progress', 'auto_repair', null, 1]);
        await db.mutate(scheduleSql, [today, 7, 'オイル交換', '09:00', 30, 'completed', 'auto_repair', null, 4]);
        await db.mutate(scheduleSql, [today, 7, '1年点検 - 目黒 300 く 5555', '10:00', 90, 'in_progress', 'auto_repair', null, 2]);
        await db.mutate(scheduleSql, [today, 7, 'ブレーキ修理', '14:00', 120, 'pending', 'auto_repair', null, 6]);
        await db.mutate(scheduleSql, [today, 7, '6ヶ月点検 - 渋谷 500 け 6666', '16:30', 30, 'pending', 'auto_repair', null, 3]);

        return NextResponse.json({
            success: true,
            message: 'Database initialized with sample data',
            initialized: true
        });
    } catch (error) {
        console.error('Error initializing database:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to initialize database' },
            { status: 500 }
        );
    }
}

// GET /api/init - 初期化状態の確認
export async function GET() {
    try {
        const db = getDB();
        const workersRows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM workers');
        const schedulesRows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM work_schedules');

        const workers = workersRows[0] || { count: 0 };
        const schedules = schedulesRows[0] || { count: 0 };

        return NextResponse.json({
            success: true,
            data: {
                workersCount: workers.count,
                schedulesCount: schedules.count,
                initialized: workers.count > 0
            }
        });
    } catch (error) {
        console.error('Error checking initialization:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check initialization' },
            { status: 500 }
        );
    }
}
