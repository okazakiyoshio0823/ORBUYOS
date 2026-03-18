import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// GET /api/master - マスタデータ取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const industry = searchParams.get('industry'); // 'demolition' | 'auto_repair'
        const db = getDB();

        let parts: any[] = [];
        let services: any[] = [];

        if (!industry || industry === 'demolition') {
            parts = await db.query('SELECT * FROM parts_master ORDER BY id');
        }

        if (!industry || industry === 'auto_repair') {
            services = await db.query('SELECT * FROM service_menus ORDER BY id');
        }

        return NextResponse.json({
            success: true,
            data: {
                parts,
                services
            }
        });
    } catch (error) {
        console.error('Error fetching master data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch master data' },
            { status: 500 }
        );
    }
}
