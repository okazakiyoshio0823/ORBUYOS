import { NextResponse } from 'next/server';
import { getDatabase, getSchedulesByDate, updateWorkPerformance } from '@/lib/db';

// GET /api/schedules - スケジュール取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        const industry = searchParams.get('industry') || 'demolition';

        const schedules = getSchedulesByDate(date, industry);

        return NextResponse.json({ success: true, data: schedules });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch schedules' },
            { status: 500 }
        );
    }
}

// POST /api/schedules - スケジュール登録
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            workDate,
            workerId,
            vehicleId,
            customerId,
            partId,
            serviceId,
            title,
            plannedStart,
            plannedMinutes,
            industry,
        } = body;

        if (!workDate || !workerId || !industry) {
            return NextResponse.json(
                { success: false, error: 'workDate, workerId, and industry are required' },
                { status: 400 }
            );
        }

        const database = getDatabase();
        const result = database.prepare(`
      INSERT INTO work_schedules (
        work_date, worker_id, vehicle_id, customer_id, 
        part_id, service_id, title, planned_start, 
        planned_minutes, status, industry, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
            workDate, workerId, vehicleId || null, customerId || null,
            partId || null, serviceId || null, title || null, plannedStart || null,
            plannedMinutes || null, industry, body.notes || null
        );

        return NextResponse.json({
            success: true,
            data: { id: result.lastInsertRowid }
        });
    } catch (error) {
        console.error('Error creating schedule:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create schedule' },
            { status: 500 }
        );
    }
}

// PUT /api/schedules - スケジュール更新（ステータス変更含む）
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, status, actualStart, actualEnd, actualMinutes, notes } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Schedule ID is required' },
                { status: 400 }
            );
        }

        const database = getDatabase();

        // 現在のスケジュール情報を取得
        const current = database.prepare('SELECT * FROM work_schedules WHERE id = ?').get(id) as {
            worker_id: number;
            model_code?: string;
            part_id?: number;
            service_id?: number;
        } | undefined;

        if (!current) {
            return NextResponse.json(
                { success: false, error: 'Schedule not found' },
                { status: 404 }
            );
        }

        // 更新データの構築
        const updates: string[] = [];
        const params: unknown[] = [];

        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        if (actualStart !== undefined) {
            updates.push('actual_start = ?');
            params.push(actualStart);
        }
        if (actualEnd !== undefined) {
            updates.push('actual_end = ?');
            params.push(actualEnd);
        }
        if (actualMinutes !== undefined) {
            updates.push('actual_minutes = ?');
            params.push(actualMinutes);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No updates provided' },
                { status: 400 }
            );
        }

        params.push(id);
        database.prepare(`UPDATE work_schedules SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        // 完了時に実績を記録（学習用）
        if (status === 'completed' && actualMinutes) {
            // 車両情報から型式を取得
            const vehicle = database.prepare(`
        SELECT model_code FROM vehicles v 
        JOIN work_schedules ws ON ws.vehicle_id = v.id 
        WHERE ws.id = ?
      `).get(id) as { model_code?: string } | undefined;

            updateWorkPerformance(
                current.worker_id,
                vehicle?.model_code || null,
                current.part_id || null,
                current.service_id || null,
                actualMinutes
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update schedule' },
            { status: 500 }
        );
    }
}

// DELETE /api/schedules - スケジュール削除
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Schedule ID is required' },
                { status: 400 }
            );
        }

        const database = getDatabase();
        database.prepare('DELETE FROM work_schedules WHERE id = ?').run(parseInt(id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete schedule' },
            { status: 500 }
        );
    }
}
