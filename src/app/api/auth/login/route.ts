import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { cookies } from 'next/headers';

// POST /api/auth/login - ログイン
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { workerId, pin } = body;

        if (!workerId) {
            return NextResponse.json(
                { success: false, error: 'Worker ID is required' },
                { status: 400 }
            );
        }

        const db = getDB();

        // 作業者を取得
        const rows = await db.query<{
            id: number;
            name: string;
            role: string;
            industry: string;
            pin?: string;
        }>('SELECT * FROM workers WHERE id = ?', [workerId]);

        const worker = rows[0];

        if (!worker) {
            return NextResponse.json(
                { success: false, error: 'Worker not found' },
                { status: 404 }
            );
        }

        // PIN検証（PINが設定されている場合のみ）
        if (worker.pin && worker.pin !== pin) {
            return NextResponse.json(
                { success: false, error: 'Invalid PIN' },
                { status: 401 }
            );
        }

        // セッショントークン生成（簡易版）
        const sessionToken = `${worker.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // クッキーにセッションを保存
        const cookieStore = await cookies();
        cookieStore.set('orbiyos_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24時間
            path: '/',
        });

        cookieStore.set('orbiyos_worker_id', String(worker.id), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return NextResponse.json({
            success: true,
            data: {
                id: worker.id,
                name: worker.name,
                role: worker.role,
                industry: worker.industry,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Login failed' },
            { status: 500 }
        );
    }
}

// GET /api/auth/login - 現在のセッション確認
export async function GET() {
    try {
        const cookieStore = await cookies();
        const workerId = cookieStore.get('orbiyos_worker_id')?.value;

        if (!workerId) {
            return NextResponse.json({
                success: true,
                data: null,
                authenticated: false
            });
        }

        const db = getDB();
        const rows = await db.query<{
            id: number;
            name: string;
            role: string;
            industry: string;
        }>('SELECT id, name, role, industry FROM workers WHERE id = ?', [workerId]);

        const worker = rows[0];

        if (!worker) {
            return NextResponse.json({
                success: true,
                data: null,
                authenticated: false
            });
        }

        return NextResponse.json({
            success: true,
            data: worker,
            authenticated: true
        });
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json(
            { success: false, error: 'Session check failed' },
            { status: 500 }
        );
    }
}

// DELETE /api/auth/login - ログアウト
export async function DELETE() {
    try {
        const cookieStore = await cookies();

        cookieStore.delete('orbiyos_session');
        cookieStore.delete('orbiyos_worker_id');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { success: false, error: 'Logout failed' },
            { status: 500 }
        );
    }
}
