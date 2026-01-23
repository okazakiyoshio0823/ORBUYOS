'use client';

import styles from './VehicleScanConfirmation.module.css';

interface VehicleData {
    plateNumber: string;
    maker: string;
    model: string;
    modelCode?: string;
    year?: string;
    color?: string;
    scanType: 'qr' | 'nfc';
    rawData?: string;
}

interface VehicleScanConfirmationProps {
    data: VehicleData;
    onConfirm: () => void;
    onCancel: () => void;
    onEdit: () => void;
}

export function VehicleScanConfirmation({ data, onConfirm, onCancel, onEdit }: VehicleScanConfirmationProps) {
    return (
        <div className={styles.overlay}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <div className={styles.scanBadge}>
                        {data.scanType === 'qr' ? '📸 QRコード読取' : '📱 ICタグ読取'}
                    </div>
                    <h2 className={styles.title}>車両情報を確認してください</h2>
                </div>

                <div className={styles.vehicleCard}>
                    <div className={styles.plateNumber}>
                        <span className={styles.plateLabel}>ナンバープレート</span>
                        <span className={styles.plateValue}>{data.plateNumber || '未取得'}</span>
                    </div>

                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>メーカー</span>
                            <span className={styles.value}>{data.maker || '—'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>車名</span>
                            <span className={styles.value}>{data.model || '—'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>型式</span>
                            <span className={styles.value}>{data.modelCode || '—'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>年式</span>
                            <span className={styles.value}>{data.year || '—'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>色</span>
                            <span className={styles.value}>{data.color || '—'}</span>
                        </div>
                    </div>

                    {data.rawData && (
                        <div className={styles.rawData}>
                            <span className={styles.rawLabel}>読取データ:</span>
                            <code className={styles.rawValue}>{data.rawData}</code>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>
                        ✕ キャンセル
                    </button>
                    <button className={styles.editBtn} onClick={onEdit}>
                        ✏️ 編集する
                    </button>
                    <button className={styles.confirmBtn} onClick={onConfirm}>
                        ✓ この内容で登録
                    </button>
                </div>
            </div>
        </div>
    );
}
