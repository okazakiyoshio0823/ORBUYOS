import { NextResponse } from 'next/server';
import { getDB, getSchedulesByDate, updateWorkPerformance } from '@/lib/db';

// GET /api/schedules - スケジュール取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        const industry = searchParams.get('industry') || 'demolition';

        const schedules = await getSchedulesByDate(date, industry);

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

        const db = getDB();
        const result = await db.mutate(`
        INSERT INTO work_schedules (
            work_date, worker_id, vehicle_id, customer_id, 
            part_id, service_id, title, planned_start, 
            planned_minutes, status, industry, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [
            workDate, workerId, vehicleId || null, customerId || null,
            partId || null, serviceId || null, title || null, plannedStart || null,
            plannedMinutes || null, industry, body.notes || null
        ]);

        return NextResponse.json({
            success: true,
            data: { id: result.lastInsertId }
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
        const { id, status, actualStart, actualEnd, actualMinutes, notes, image_url } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Schedule ID is required' },
                { status: 400 }
            );
        }

        const db = getDB();

        // 現在のスケジュール情報を取得
        const rows = await db.query<{
            worker_id: number;
            model_code?: string;
            part_id?: number;
            service_id?: number;
        }>('SELECT * FROM work_schedules WHERE id = ?', [id]);

        const current = rows[0];

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
        if (image_url !== undefined) {
            updates.push('image_url = ?');
            params.push(image_url);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No updates provided' },
                { status: 400 }
            );
        }

        params.push(id);
        await db.mutate(`UPDATE work_schedules SET ${updates.join(', ')} WHERE id = ?`, params);

        // 完了時に実績を記録（学習用）
        if (status === 'completed' && actualMinutes) {
            // 車両情報から型式を取得
            const vehicleRows = await db.query<{ model_code?: string }>(`
                SELECT model_code FROM vehicles v 
                JOIN work_schedules ws ON ws.vehicle_id = v.id 
                WHERE ws.id = ?
            `, [id]);
            const vehicle = vehicleRows[0];

            await updateWorkPerformance(
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

        const db = getDB();
        await db.mutate('DELETE FROM work_schedules WHERE id = ?', [parseInt(id)]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete schedule' },
            { status: 500 }
        );
    }
}
