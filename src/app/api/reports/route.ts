import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
        const industry = searchParams.get('industry') || 'demolition';

        const db = getDatabase();

        // 車両統計
        const vehicleTotal = db.prepare(`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE industry = ? AND received_date BETWEEN ? AND ?
    `).get(industry, startDate, endDate) as { count: number };

        const vehiclesByStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM vehicles 
      WHERE industry = ? AND received_date BETWEEN ? AND ?
      GROUP BY status
    `).all(industry, startDate, endDate) as Array<{ status: string; count: number }>;

        const vehiclesByMaker = db.prepare(`
      SELECT maker, COUNT(*) as count 
      FROM vehicles 
      WHERE industry = ? AND received_date BETWEEN ? AND ?
      GROUP BY maker 
      ORDER BY count DESC
      LIMIT 10
    `).all(industry, startDate, endDate) as Array<{ maker: string; count: number }>;

        // 作業統計（解体業：部品別）
        const tasksByPart = industry === 'demolition' ? db.prepare(`
      SELECT p.name, COUNT(*) as count
      FROM work_schedules ws
      JOIN parts_master p ON ws.part_id = p.id
      WHERE ws.industry = ? AND ws.work_date BETWEEN ? AND ?
      GROUP BY p.name
      ORDER BY count DESC
      LIMIT 15
    `).all(industry, startDate, endDate) as Array<{ name: string; count: number }> : [];

        // 作業統計（整備業：サービス別）
        const tasksByService = industry === 'auto_repair' ? db.prepare(`
      SELECT s.name, COUNT(*) as count
      FROM work_schedules ws
      JOIN service_menus s ON ws.service_id = s.id
      WHERE ws.industry = ? AND ws.work_date BETWEEN ? AND ?
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 15
    `).all(industry, startDate, endDate) as Array<{ name: string; count: number }> : [];

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
