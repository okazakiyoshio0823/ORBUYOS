'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

interface Worker {
    id: number;
    name: string;
    role: string;
    industry: string;
}

export default function LoginPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    // 作業者一覧を取得
    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                // まずDBを初期化
                await fetch('/api/init', { method: 'POST' });

                // 全作業者を取得
                const res = await fetch('/api/workers');
                const data = await res.json();
                if (data.success) {
                    setWorkers(data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch workers:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // セッション確認
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/login');
                const data = await res.json();
                if (data.authenticated) {
                    router.push('/');
                }
            } catch (err) {
                console.error('Session check failed:', err);
            }
        };

        checkSession();
        fetchWorkers();
    }, [router]);

    const handleLogin = async () => {
        if (!selectedWorker) {
            setError('作業者を選択してください');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId: selectedWorker, pin }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/');
            } else {
                setError(data.error || 'ログインに失敗しました');
            }
        } catch (err) {
            console.error('Login failed:', err);
            setError('ログインに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    // 業種でグループ化
    const demolitionWorkers = workers.filter(w => w.industry === 'demolition');
    const autoRepairWorkers = workers.filter(w => w.industry === 'auto_repair');

    if (isLoading && workers.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>ORBIYOS</h1>
                    <p className={styles.subtitle}>汎用業務支援システム</p>
                </div>

                <div className={styles.form}>
                    <h2 className={styles.title}>ログイン</h2>
                    <p className={styles.description}>作業者を選択してください</p>

                    {error && (
                        <div className={styles.error}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className={styles.workerSelection}>
                        {demolitionWorkers.length > 0 && (
                            <div className={styles.workerGroup}>
                                <h3 className={styles.groupTitle}>🔧 解体業</h3>
                                <div className={styles.workerList}>
                                    {demolitionWorkers.map(worker => (
                                        <button
                                            key={worker.id}
                                            className={`${styles.workerBtn} ${selectedWorker === worker.id ? styles.selected : ''}`}
                                            onClick={() => setSelectedWorker(worker.id)}
                                        >
                                            <span className={styles.workerIcon}>👤</span>
                                            <span className={styles.workerName}>{worker.name}</span>
                                            <span className={styles.workerRole}>{worker.role}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {autoRepairWorkers.length > 0 && (
                            <div className={styles.workerGroup}>
                                <h3 className={styles.groupTitle}>🚗 整備業</h3>
                                <div className={styles.workerList}>
                                    {autoRepairWorkers.map(worker => (
                                        <button
                                            key={worker.id}
                                            className={`${styles.workerBtn} ${selectedWorker === worker.id ? styles.selected : ''}`}
                                            onClick={() => setSelectedWorker(worker.id)}
                                        >
                                            <span className={styles.workerIcon}>👤</span>
                                            <span className={styles.workerName}>{worker.name}</span>
                                            <span className={styles.workerRole}>{worker.role}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className={styles.loginBtn}
                        onClick={handleLogin}
                        disabled={!selectedWorker || isLoading}
                    >
                        {isLoading ? '処理中...' : 'ログイン'}
                    </button>

                    <p className={styles.hint}>
                        ※ 現場のタブレットやスマホからでも同じURLでアクセスできます
                    </p>
                </div>
            </div>
        </div>
    );
}
