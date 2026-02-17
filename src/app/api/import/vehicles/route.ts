import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// POST /api/import/vehicles - 車両データのCSVインポート
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { data, industry } = body;

        if (!data || !Array.isArray(data)) {
            return NextResponse.json(
                { success: false, error: 'Invalid data format' },
                { status: 400 }
            );
        }

        const database = getDatabase();
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        const insertVehicle = database.prepare(`
      INSERT INTO vehicles (
        plate_number, maker, model, model_code, year, color,
        customer_id, industry, status, received_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);

        for (const row of data) {
            try {
                // 必須フィールドのチェック
                if (!row.plateNumber && !row.plate_number && !row.ナンバー) {
                    skipped++;
                    continue;
                }

                // フィールドのマッピング（日本語/英語両対応）
                const plateNumber = row.plateNumber || row.plate_number || row.ナンバー || '';
                const maker = row.maker || row.メーカー || '';
                const model = row.model || row.車名 || '';
                const modelCode = row.modelCode || row.model_code || row.型式 || '';
                const year = row.year || row.年式 || null;
                const color = row.color || row.色 || '';
                const notes = row.notes || row.備考 || '';
                const receivedDate = row.receivedDate || row.received_date || row.入庫日 || new Date().toISOString().split('T')[0];

                insertVehicle.run(
                    plateNumber,
                    maker,
                    model,
                    modelCode,
                    year ? parseInt(year) : null,
                    color,
                    null, // customer_id
                    industry || 'demolition',
                    receivedDate,
                    notes
                );

                imported++;
            } catch (err) {
                const error = err as Error;
                errors.push(`Row error: ${error.message}`);
                skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                imported,
                skipped,
                total: data.length,
                errors: errors.slice(0, 5), // 最初の5件のエラーのみ
            }
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { success: false, error: 'Import failed' },
            { status: 500 }
        );
    }
}
