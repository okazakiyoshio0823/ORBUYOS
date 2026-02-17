import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const industry = searchParams.get('industry') as 'demolition' | 'auto_repair' | null;

        if (!date) {
            return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
        }

        const schedules = getSchedules(date, industry || undefined);

        // CSVヘッダー
        const header = [
            'ID',
            '日付',
            '業種',
            '作業者名',
            '車両ID',
            '作業/部品名',
            '予定開始時間',
            '予定時間(分)',
            'ステータス',
            '実績開始時間',
            '実績終了時間'
        ].join(',');

        // データ行
        const rows = schedules.map((s: any) => [
            s.id,
            s.work_date,
            industry === 'demolition' ? '解体' : '整備',
            `"${s.worker_name}"`, // カンマを含む可能性があるためクォート
            s.vehicle_id || '',
            `"${s.title || ''}"`,
            s.planned_start || '',
            s.planned_minutes || '',
            s.status,
            s.actual_start || '',
            s.actual_end || ''
        ].join(','));

        const csvContent = [header, ...rows].join('\n');

        // 文字コードはShift_JISにするのが一般的だが、簡易的にUTF-8 with BOMで返す
        const bom = '\uFEFF';
        const csvWithBom = bom + csvContent;

        return new NextResponse(csvWithBom, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="work_report_${date}.csv"`,
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ success: false, error: 'Failed to export CSV' }, { status: 500 });
    }
}
