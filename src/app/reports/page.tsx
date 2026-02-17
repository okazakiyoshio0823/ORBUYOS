'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { toast } from 'react-hot-toast';

type Industry = 'demolition' | 'auto_repair';

interface ReportsData {
    vehicles: {
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        byMaker: Array<{ maker: string; count: number }>;
    };
    tasks: {
        byPart: Array<{ name: string; count: number }>;
        byService: Array<{ name: string; count: number }>;
    };
}

export default function ReportsPage() {
    const router = useRouter();
    const [industry, setIndustry] = useState<Industry>('demolition');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportsData, setReportsData] = useState<ReportsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // 初期値として当月の開始日と終了日を設定
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    }, []);

    // データ取得
    useEffect(() => {
        if (!startDate || !endDate) return;

        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}&industry=${industry}`);
                const data = await res.json();
                if (data.success) {
                    setReportsData(data.data);
                } else {
                    toast.error('レポートデータの取得に失敗しました');
                }
            } catch (error) {
                console.error('Failed to fetch reports:', error);
                toast.error('通信エラーが発生しました');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, [startDate, endDate, industry]);

    return (
        <div className={styles.container}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.logo}>ORBIYOS</div>
                    <div className={styles.subtitle}>汎用業務支援システム</div>
                    <nav className={styles.headerNav}>
                        <a href="/" className={styles.navLink}>📅 カレンダー</a>
                        <a href="/reports" className={`${styles.navLink} ${styles.active}`}>📊 レポート</a>
                    </nav>
                </div>

                <div className={styles.headerRight}>
                    <button
                        className={`${styles.industryBtn} ${industry === 'demolition' ? styles.active : ''}`}
                        onClick={() => setIndustry('demolition')}
                    >
                        🚧 解体業
                    </button>
                    <button
                        className={`${styles.industryBtn} ${industry === 'auto_repair' ? styles.active : ''}`}
                        onClick={() => setIndustry('auto_repair')}
                    >
                        🔧 整備業
                    </button>

                    <button className={styles.logoutBtn} onClick={() => router.push('/')}>
                        🏠 ホームへ
                    </button>
                </div>
            </header>

            <main className={styles.main}>
                {/* 期間選択 */}
                <div className={styles.periodSelector}>
                    <h2>📊 集計レポート</h2>
                    <div className={styles.periodInputs}>
                        <div className={styles.inputGroup}>
                            <label>開始日</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                        <span className={styles.dateSeparator}>～</span>
                        <div className={styles.inputGroup}>
                            <label>終了日</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>データ読み込み中...</p>
                    </div>
                ) : reportsData ? (
                    <>
                        {/* 車両統計 */}
                        <section className={styles.reportSection}>
                            <h3 className={styles.sectionTitle}>🚗 車両統計</h3>
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>総入庫台数</div>
                                    <div className={styles.statValue}>{reportsData.vehicles.total}台</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>作業完了</div>
                                    <div className={styles.statValue}>{reportsData.vehicles.completed}台</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>作業中</div>
                                    <div className={styles.statValue}>{reportsData.vehicles.inProgress}台</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>未着手</div>
                                    <div className={styles.statValue}>{reportsData.vehicles.pending}台</div>
                                </div>
                            </div>

                            {/* メーカー別内訳 */}
                            {reportsData.vehicles.byMaker.length > 0 && (
                                <div className={styles.chartContainer}>
                                    <h4 className={styles.chartTitle}>メーカー別内訳</h4>
                                    <div className={styles.barChart}>
                                        {reportsData.vehicles.byMaker.map((item, index) => {
                                            const maxCount = Math.max(...reportsData.vehicles.byMaker.map(i => i.count));
                                            const percentage = (item.count / maxCount) * 100;

                                            return (
                                                <div key={index} className={styles.barRow}>
                                                    <div className={styles.barLabel}>{item.maker}</div>
                                                    <div className={styles.barWrapper}>
                                                        <div
                                                            className={styles.bar}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className={styles.barValue}>{item.count}台</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 作業内容統計 */}
                        <section className={styles.reportSection}>
                            <h3 className={styles.sectionTitle}>📋 作業内容統計</h3>

                            {industry === 'demolition' && reportsData.tasks.byPart.length > 0 && (
                                <div className={styles.chartContainer}>
                                    <h4 className={styles.chartTitle}>部品別作業件数</h4>
                                    <div className={styles.barChart}>
                                        {reportsData.tasks.byPart.map((item, index) => {
                                            const maxCount = Math.max(...reportsData.tasks.byPart.map(i => i.count));
                                            const percentage = (item.count / maxCount) * 100;

                                            return (
                                                <div key={index} className={styles.barRow}>
                                                    <div className={styles.barLabel}>{item.name}</div>
                                                    <div className={styles.barWrapper}>
                                                        <div
                                                            className={styles.bar}
                                                            style={{ width: `${percentage}%`, backgroundColor: '#4CAF50' }}
                                                        ></div>
                                                    </div>
                                                    <div className={styles.barValue}>{item.count}件</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {industry === 'auto_repair' && reportsData.tasks.byService.length > 0 && (
                                <div className={styles.chartContainer}>
                                    <h4 className={styles.chartTitle}>整備メニュー別作業件数</h4>
                                    <div className={styles.barChart}>
                                        {reportsData.tasks.byService.map((item, index) => {
                                            const maxCount = Math.max(...reportsData.tasks.byService.map(i => i.count));
                                            const percentage = (item.count / maxCount) * 100;

                                            return (
                                                <div key={index} className={styles.barRow}>
                                                    <div className={styles.barLabel}>{item.name}</div>
                                                    <div className={styles.barWrapper}>
                                                        <div
                                                            className={styles.bar}
                                                            style={{ width: `${percentage}%`, backgroundColor: '#2196F3' }}
                                                        ></div>
                                                    </div>
                                                    <div className={styles.barValue}>{item.count}件</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {((industry === 'demolition' && reportsData.tasks.byPart.length === 0) ||
                                (industry === 'auto_repair' && reportsData.tasks.byService.length === 0)) && (
                                    <div className={styles.noData}>
                                        <p>📭 選択期間内の作業データがありません</p>
                                    </div>
                                )}
                        </section>
                    </>
                ) : (
                    <div className={styles.noData}>
                        <p>期間を選択してください</p>
                    </div>
                )}
            </main>
        </div>
    );
}
