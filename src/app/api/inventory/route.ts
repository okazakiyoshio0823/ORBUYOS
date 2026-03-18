import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partId, vehicleId, priceEstimate } = body;

    const db = getDB();
    const result = await db.mutate(
      'INSERT INTO inventory_parts (part_id, vehicle_id, price_estimate, status) VALUES (?, ?, ?, ?)',
      [partId, vehicleId, priceEstimate || 0, 'available']
    );

    return NextResponse.json({ success: true, id: result.lastInsertId });
  } catch (error) {
    console.error('Failed to add inventory part:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add inventory part' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = getDB();
    // JOIN parts_master and vehicles for display
    const parts = await db.query(`
      SELECT 
        ip.id, ip.part_id, ip.vehicle_id, ip.status, ip.price_estimate, ip.created_at,
        pm.name as part_name,
        v.maker, v.model
      FROM inventory_parts ip
      JOIN parts_master pm ON ip.part_id = pm.id
      LEFT JOIN vehicles v ON ip.vehicle_id = v.id
      WHERE ip.status = 'available'
      ORDER BY ip.created_at DESC
    `);
    
    return NextResponse.json({ success: true, data: parts });
  } catch (error) {
    console.error('Failed to get inventory parts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get inventory parts' },
      { status: 500 }
    );
  }
}
