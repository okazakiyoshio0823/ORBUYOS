'use client';

import { useState, useRef } from 'react';
import styles from './ImportData.module.css';

interface ImportDataProps {
    industry: 'demolition' | 'auto_repair';
    onSuccess?: () => void;
    onClose: () => void;
}

interface ImportResult {
    imported: number;
    skipped: number;
    total: number;
    errors: string[];
}

export function ImportData({ industry, onSuccess, onClose }: ImportDataProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // CSVパース
    const parseCSV = (text: string): Record<string, string>[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const data: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }

        return data;
    };

    // ファイル選択
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
            setError('');
        }
    };

    // インポート実行
    const handleImport = async () => {
        if (!file) return;

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const text = await file.text();
            const data = parseCSV(text);

            if (data.length === 0) {
                setError('有効なデータがありません');
                setIsLoading(false);
                return;
            }

            const res = await fetch('/api/import/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, industry }),
            });

            const result = await res.json();

            if (result.success) {
                setResult(result.data);
                if (onSuccess) onSuccess();
            } else {
                setError(result.error || 'インポートに失敗しました');
            }
        } catch (err) {
            console.error('Import error:', err);
            setError('ファイルの読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>📥 CSVファイルをインポート</h3>
                <p className={styles.description}>
                    車両データをCSVファイルから一括登録できます。
                </p>

                <div className={styles.fileArea}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className={styles.fileInput}
                    />
                    <button
                        className={styles.fileButton}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        📁 ファイルを選択
                    </button>
                    {file && (
                        <span className={styles.fileName}>{file.name}</span>
                    )}
                </div>
            </div>

            <div className={styles.section}>
                <h4 className={styles.formatTitle}>📋 対応フォーマット</h4>
                <div className={styles.formatExample}>
                    <code>ナンバー,メーカー,車名,型式,年式,色,備考</code>
                    <code>品川500あ1234,トヨタ,プリウス,ZVW30,2020,ホワイト,エンジン取り外し済</code>
                </div>
                <p className={styles.hint}>
                    ※ 英語カラム名（plateNumber, maker, model等）にも対応
                </p>
            </div>

            {error && (
                <div className={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div className={styles.result}>
                    <div className={styles.resultItem}>
                        <span className={styles.resultLabel}>✅ インポート成功:</span>
                        <span className={styles.resultValue}>{result.imported}件</span>
                    </div>
                    <div className={styles.resultItem}>
                        <span className={styles.resultLabel}>⏭️ スキップ:</span>
                        <span className={styles.resultValue}>{result.skipped}件</span>
                    </div>
                    <div className={styles.resultItem}>
                        <span className={styles.resultLabel}>📊 合計:</span>
                        <span className={styles.resultValue}>{result.total}件</span>
                    </div>
                    {result.errors.length > 0 && (
                        <div className={styles.errors}>
                            <p>エラー:</p>
                            <ul>
                                {result.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className={styles.actions}>
                <button
                    className={styles.cancelBtn}
                    onClick={onClose}
                >
                    閉じる
                </button>
                <button
                    className={styles.importBtn}
                    onClick={handleImport}
                    disabled={!file || isLoading}
                >
                    {isLoading ? '処理中...' : 'インポート実行'}
                </button>
            </div>
        </div>
    );
}
