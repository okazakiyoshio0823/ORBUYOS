import { NextResponse } from 'next/server';
import { getDatabase, findAll, insert, update, remove } from '@/lib/db';

// GET /api/workers - 作業者一覧取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const industry = searchParams.get('industry');

        const where = industry ? { industry } : undefined;
        const workers = findAll('workers', where);

        return NextResponse.json({ success: true, data: workers });
    } catch (error) {
        console.error('Error fetching workers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch workers' },
            { status: 500 }
        );
    }
}

// POST /api/workers - 作業者登録
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, role = 'worker', industry } = body;

        if (!name || !industry) {
            return NextResponse.json(
                { success: false, error: 'Name and industry are required' },
                { status: 400 }
            );
        }

        const id = insert('workers', { name, role, industry });

        return NextResponse.json({ success: true, data: { id, name, role, industry } });
    } catch (error) {
        console.error('Error creating worker:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create worker' },
            { status: 500 }
        );
    }
}
