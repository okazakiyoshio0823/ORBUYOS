import { NextResponse } from 'next/server';
import { findAll, findById, insert, update, remove } from '@/lib/db';

// GET /api/vehicles - 車両一覧取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const industry = searchParams.get('industry');
        const status = searchParams.get('status');

        let where: Record<string, unknown> = {};
        if (industry) where.industry = industry;
        if (status) where.status = status;

        const vehicles = findAll('vehicles', Object.keys(where).length > 0 ? where : undefined);

        return NextResponse.json({ success: true, data: vehicles });
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch vehicles' },
            { status: 500 }
        );
    }
}

// POST /api/vehicles - 車両登録
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            plateNumber,
            maker,
            model,
            modelCode,
            year,
            color,
            customerId,
            industry,
            notes,
        } = body;

        if (!industry) {
            return NextResponse.json(
                { success: false, error: 'Industry is required' },
                { status: 400 }
            );
        }

        const vehicleData: Record<string, unknown> = {
            plate_number: plateNumber,
            maker,
            model,
            model_code: modelCode,
            year: year ? parseInt(year) : null,
            color,
            customer_id: customerId,
            industry,
            notes,
            status: 'pending',
            received_date: new Date().toISOString().split('T')[0],
        };

        const id = insert('vehicles', vehicleData);

        return NextResponse.json({
            success: true,
            data: { id, ...vehicleData }
        });
    } catch (error) {
        console.error('Error creating vehicle:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create vehicle' },
            { status: 500 }
        );
    }
}

// PUT /api/vehicles - 車両更新
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Vehicle ID is required' },
                { status: 400 }
            );
        }

        // snake_case に変換
        const dbData: Record<string, unknown> = {};
        if (updateData.plateNumber !== undefined) dbData.plate_number = updateData.plateNumber;
        if (updateData.maker !== undefined) dbData.maker = updateData.maker;
        if (updateData.model !== undefined) dbData.model = updateData.model;
        if (updateData.modelCode !== undefined) dbData.model_code = updateData.modelCode;
        if (updateData.year !== undefined) dbData.year = updateData.year;
        if (updateData.color !== undefined) dbData.color = updateData.color;
        if (updateData.status !== undefined) dbData.status = updateData.status;
        if (updateData.notes !== undefined) dbData.notes = updateData.notes;

        update('vehicles', id, dbData);

        return NextResponse.json({ success: true, data: { id, ...dbData } });
    } catch (error) {
        console.error('Error updating vehicle:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update vehicle' },
            { status: 500 }
        );
    }
}

// DELETE /api/vehicles - 車両削除
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Vehicle ID is required' },
                { status: 400 }
            );
        }

        remove('vehicles', parseInt(id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete vehicle' },
            { status: 500 }
        );
    }
}
