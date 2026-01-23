'use client';

import { useState } from 'react';
import { QRScanner } from './QRScanner';
import { NFCReader } from './NFCReader';
import { VehicleScanConfirmation } from './VehicleScanConfirmation';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// 車両登録フォーム
interface VehicleFormData {
    plateNumber: string;
    maker: string;
    model: string;
    modelCode: string;
    year: string;
    color: string;
    customerName: string;
    notes: string;
}

// スキャン結果データ
interface ScannedVehicleData {
    plateNumber: string;
    maker: string;
    model: string;
    modelCode?: string;
    year?: string;
    color?: string;
    scanType: 'qr' | 'nfc';
    rawData?: string;
}

interface VehicleFormProps {
    industry: 'demolition' | 'auto_repair';
    onSubmit: (data: VehicleFormData) => void;
    onCancel: () => void;
}

export function VehicleForm({ industry, onSubmit, onCancel }: VehicleFormProps) {
    const [formData, setFormData] = useState<VehicleFormData>({
        plateNumber: '',
        maker: '',
        model: '',
        modelCode: '',
        year: '',
        color: '',
        customerName: '',
        notes: '',
    });

    const [showScanner, setShowScanner] = useState<'none' | 'qr' | 'nfc'>('none');
    const [scannedData, setScannedData] = useState<ScannedVehicleData | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    // スキャン結果をパースしてポップアップ表示用データに変換
    const handleScan = (data: string, scanType: 'qr' | 'nfc') => {
        if (!data) return;

        let parsed: ScannedVehicleData = {
            plateNumber: '',
            maker: '',
            model: '',
            scanType,
            rawData: data,
        };

        try {
            // カンマ区切り（QRコード用簡易フォーマット）
            if (data.includes(',')) {
                const parts = data.split(',');
                parsed = {
                    ...parsed,
                    plateNumber: parts[0] || '',
                    maker: parts[1] || '',
                    model: parts[2] || '',
                    modelCode: parts[3] || '',
                    year: parts[4] || '',
                    color: parts[5] || '',
                };
            } else if (data.startsWith('IC-')) {
                // ICタグデータ（デモ用自動補完）
                parsed = {
                    ...parsed,
                    plateNumber: '品川 500 IC 9999',
                    maker: 'トヨタ',
                    model: 'アクア',
                    modelCode: 'NHP10',
                    year: '2023',
                    color: 'ホワイト',
                };
            } else {
                // その他のデータ
                parsed.plateNumber = data;
            }
        } catch (error) {
            console.error('Scan parse error:', error);
        }

        setShowScanner('none');
        setScannedData(parsed); // ポップアップ表示
    };

    // ポップアップで「登録」を押した場合
    const handleConfirmScan = () => {
        if (!scannedData) return;

        // スキャンデータをフォームに反映して即送信
        const vehicleData: VehicleFormData = {
            plateNumber: scannedData.plateNumber,
            maker: scannedData.maker,
            model: scannedData.model,
            modelCode: scannedData.modelCode || '',
            year: scannedData.year || '',
            color: scannedData.color || '',
            customerName: '',
            notes: `${scannedData.scanType === 'qr' ? 'QRコード' : 'ICタグ'}読取\n${scannedData.rawData || ''}`,
        };

        onSubmit(vehicleData);
        setScannedData(null);
    };

    // ポップアップで「編集」を押した場合
    const handleEditScan = () => {
        if (!scannedData) return;

        // スキャンデータをフォームに反映（編集モードへ）
        setFormData({
            plateNumber: scannedData.plateNumber,
            maker: scannedData.maker,
            model: scannedData.model,
            modelCode: scannedData.modelCode || '',
            year: scannedData.year || '',
            color: scannedData.color || '',
            customerName: '',
            notes: `${scannedData.scanType === 'qr' ? 'QRコード' : 'ICタグ'}読取`,
        });
        setScannedData(null);
    };

    // スキャン確認ポップアップ
    if (scannedData) {
        return (
            <VehicleScanConfirmation
                data={scannedData}
                onConfirm={handleConfirmScan}
                onCancel={() => setScannedData(null)}
                onEdit={handleEditScan}
            />
        );
    }

    if (showScanner === 'qr') {
        return (
            <QRScanner
                onScan={(data) => handleScan(data, 'qr')}
                onClose={() => setShowScanner('none')}
            />
        );
    }

    if (showScanner === 'nfc') {
        return (
            <NFCReader
                onRead={(data) => handleScan(data, 'nfc')}
                onClose={() => setShowScanner('none')}
            />
        );
    }

    const makers = ['トヨタ', 'ホンダ', '日産', 'マツダ', 'スズキ', 'ダイハツ', 'スバル', '三菱', 'その他'];

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>ナンバープレート</label>
                    <input
                        type="text"
                        name="plateNumber"
                        className={styles.input}
                        placeholder="品川 500 あ 1234"
                        value={formData.plateNumber}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>メーカー</label>
                    <select
                        name="maker"
                        className={styles.select}
                        value={formData.maker}
                        onChange={handleChange}
                        required
                    >
                        <option value="">選択してください</option>
                        {makers.map(maker => (
                            <option key={maker} value={maker}>{maker}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>車名</label>
                    <input
                        type="text"
                        name="model"
                        className={styles.input}
                        placeholder="プリウス"
                        value={formData.model}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>型式</label>
                    <input
                        type="text"
                        name="modelCode"
                        className={styles.input}
                        placeholder="ZVW30"
                        value={formData.modelCode}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>年式</label>
                    <input
                        type="text"
                        name="year"
                        className={styles.input}
                        placeholder="2020"
                        value={formData.year}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>色</label>
                    <input
                        type="text"
                        name="color"
                        className={styles.input}
                        placeholder="ホワイト"
                        value={formData.color}
                        onChange={handleChange}
                    />
                </div>

                {industry === 'auto_repair' && (
                    <div className={styles.formGroup}>
                        <label className={styles.label}>顧客名</label>
                        <input
                            type="text"
                            name="customerName"
                            className={styles.input}
                            placeholder="山田 太郎"
                            value={formData.customerName}
                            onChange={handleChange}
                        />
                    </div>
                )}

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>備考</label>
                    <textarea
                        name="notes"
                        className={styles.textarea}
                        placeholder="特記事項があれば入力"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                    />
                </div>
            </div>

            <div className={styles.scanAction}>
                <button
                    type="button"
                    className={styles.scanBtn}
                    onClick={() => setShowScanner('qr')}
                >
                    📸 QR読取
                </button>
                <button
                    type="button"
                    className={styles.scanBtn}
                    onClick={() => setShowScanner('nfc')}
                >
                    📱 ICタグ
                </button>
            </div>

            <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                    キャンセル
                </button>
                <button type="submit" className={styles.submitBtn}>
                    登録する
                </button>
            </div>
        </form>
    );
}

// 作業割当フォーム
interface WorkAssignmentFormProps {
    industry: 'demolition' | 'auto_repair';
    onSubmit: (data: WorkAssignmentData) => void;
    onCancel: () => void;
}

interface WorkAssignmentData {
    vehicleId: string;
    workerId: string;
    partOrServiceId: string;
    plannedStart: string;
    plannedMinutes: string;
}

export function WorkAssignmentForm({ industry, onSubmit, onCancel }: WorkAssignmentFormProps) {
    const [formData, setFormData] = useState<WorkAssignmentData>({
        vehicleId: '',
        workerId: '',
        partOrServiceId: '',
        plannedStart: '09:00',
        plannedMinutes: '60',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    // モックデータ
    const mockVehicles = [
        { id: '1', label: 'プリウス ZVW30 (品川 500 あ 1234)' },
        { id: '2', label: 'フィット GE6 (練馬 300 い 5678)' },
        { id: '3', label: 'アクア NHP10 (世田谷 500 う 9012)' },
    ];

    const mockWorkers = industry === 'demolition'
        ? [
            { id: '1', name: '山田 太郎' },
            { id: '2', name: '佐藤 次郎' },
            { id: '3', name: '田中 三郎' },
        ]
        : [
            { id: '4', name: '鈴木 健太' },
            { id: '5', name: '高橋 修' },
            { id: '6', name: '渡辺 勇' },
        ];

    const mockPartsOrServices = industry === 'demolition'
        ? [
            { id: '1', name: 'エンジン', minutes: 60 },
            { id: '2', name: 'ミッション', minutes: 45 },
            { id: '3', name: 'フロントドア(左)', minutes: 10 },
            { id: '4', name: 'リアドア(右)', minutes: 10 },
            { id: '5', name: 'ボンネット', minutes: 15 },
        ]
        : [
            { id: '1', name: '車検', minutes: 120 },
            { id: '2', name: '1年点検', minutes: 90 },
            { id: '3', name: '6ヶ月点検', minutes: 30 },
            { id: '4', name: 'オイル交換', minutes: 20 },
            { id: '5', name: 'ブレーキパッド交換', minutes: 60 },
        ];

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>車両</label>
                    <select
                        name="vehicleId"
                        className={styles.select}
                        value={formData.vehicleId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">選択してください</option>
                        {mockVehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>担当者</label>
                    <select
                        name="workerId"
                        className={styles.select}
                        value={formData.workerId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">選択してください</option>
                        {mockWorkers.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>{industry === 'demolition' ? '部品' : '作業内容'}</label>
                    <select
                        name="partOrServiceId"
                        className={styles.select}
                        value={formData.partOrServiceId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">選択してください</option>
                        {mockPartsOrServices.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.minutes}分)</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>開始時間</label>
                    <input
                        type="time"
                        name="plannedStart"
                        className={styles.input}
                        value={formData.plannedStart}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>作業時間（分）</label>
                    <input
                        type="number"
                        name="plannedMinutes"
                        className={styles.input}
                        value={formData.plannedMinutes}
                        onChange={handleChange}
                        min="5"
                        max="480"
                        required
                    />
                </div>
            </div>

            <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                    キャンセル
                </button>
                <button type="submit" className={styles.submitBtn}>
                    割当する
                </button>
            </div>
        </form>
    );
}
