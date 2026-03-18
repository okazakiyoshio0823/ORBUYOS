import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
        const industry = searchParams.get('industry') || 'demolition';

        const db = getDB();

        // 車両統計
        const vehicleTotalRows = await db.query<{ count: number }>(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE industry = ? AND received_date BETWEEN ? AND ?
    `, [industry, startDate, endDate]);
        const vehicleTotal = vehicleTotalRows[0] || { count: 0 };

        const vehiclesByStatus = await db.query<{ status: string; count: number }>(`
      SELECT status, COUNT(*) as count 
      FROM vehicles 
      WHERE industry = ? AND received_date BETWEEN ? AND ?
      GROUP BY status
    `, [industry, startDate, endDate]);

        const vehiclesByMaker = await db.query<{ maker: string; count: number }>(`
      SELECT maker, COUNT(*) as count 
      FROM vehicles 
      WHERE industry = ? AND received_date BETWEEN ? AND ?
      GROUP BY maker 
      ORDER BY count DESC
      LIMIT 10
    `, [industry, startDate, endDate]);

        // 作業統計（解体業：部品別）
        let tasksByPart: Array<{ name: string; count: number }> = [];
        if (industry === 'demolition') {
            tasksByPart = await db.query<{ name: string; count: number }>(`
        SELECT p.name, COUNT(*) as count
        FROM work_schedules ws
        JOIN parts_master p ON ws.part_id = p.id
        WHERE ws.industry = ? AND ws.work_date BETWEEN ? AND ?
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 15
      `, [industry, startDate, endDate]);
        }

        // 作業統計（整備業：サービス別）
        let tasksByService: Array<{ name: string; count: number }> = [];
        if (industry === 'auto_repair') {
            tasksByService = await db.query<{ name: string; count: number }>(`
        SELECT s.name, COUNT(*) as count
        FROM work_schedules ws
        JOIN service_menus s ON ws.service_id = s.id
        WHERE ws.industry = ? AND ws.work_date BETWEEN ? AND ?
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 15
      `, [industry, startDate, endDate]);
        }

        // ステータス別集計
        const statusCounts = {
            total: vehicleTotal.count,
            completed: vehiclesByStatus.find(s => s.status === 'completed')?.count || 0,
            inProgress: vehiclesByStatus.find(s => s.status === 'in_progress')?.count || 0,
            pending: vehiclesByStatus.find(s => s.status === 'pending')?.count || 0,
        };

        return NextResponse.json({
            success: true,
            data: {
                vehicles: {
                    ...statusCounts,
                    byMaker: vehiclesByMaker,
                },
                tasks: {
                    byPart: tasksByPart,
                    byService: tasksByService,
                },
            },
        });
    } catch (error) {
        console.error('Reports API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch reports data' },
            { status: 500 }
        );
    }
}
