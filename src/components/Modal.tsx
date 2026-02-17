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
export interface VehicleFormData {
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



import { vehicleData } from '../data/vehicleData';
import { searchExternalSystem, ExternalVehicleData } from '../lib/externalSystem';

// ナンバープレート地域名リスト（主要なもの＋その他対応）
const PLATE_REGIONS = [
    '品川', '練馬', '足立', '八王子', '多摩',
    '横浜', '川崎', '相模', '湘南',
    '千葉', '成田', '習志野',
    '大宮', '所沢', '川越', '熊谷',
    '水戸', '土浦', 'つくば',
    '宇都宮', '那須',
    '群馬', '前橋',
    '名古屋', '豊橋', '三河', '岡崎', '豊田',
    '大阪', 'なにわ', '和泉', '堺',
    '神戸', '姫路',
    '京都',
    '奈良',
    '滋賀',
    '岡山', '倉敷',
    '広島', '福山',
    '山口', '下関',
    '鳥取',
    '島根',
    '福岡', '北九州', '久留米', '筑豊',
    '札幌', '函館',
    '仙台', '宮城',
    'その他'
];

// ナンバープレートひらがなリスト
const PLATE_HIRAGANA = [
    'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ',
    'さ', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'ほ', 'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ',
    'を'
];

export function VehicleForm({ industry, onSubmit, onCancel }: VehicleFormProps) {
    // タブモード: 'manual' | 'scan' | 'external'
    const [mode, setMode] = useState<'manual' | 'scan' | 'external'>('manual');

    // フォームデータ (plateNumberを除く)
    const [formData, setFormData] = useState<Omit<VehicleFormData, 'plateNumber'> & { plateNumber?: string }>({
        maker: '',
        model: '',
        modelCode: '',
        year: '',
        color: '',
        customerName: '',
        notes: '',
    });

    // ナンバープレート分割ステート
    const [plateRegion, setPlateRegion] = useState('');
    const [plateClass, setPlateClass] = useState('');
    const [plateHiragana, setPlateHiragana] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    // 「その他」地域用の入力
    const [customRegion, setCustomRegion] = useState('');


    // スキャン関連
    const [showScanner, setShowScanner] = useState<'none' | 'qr' | 'nfc'>('none');
    const [scannedData, setScannedData] = useState<ScannedVehicleData | null>(null);

    // 連動プルダウン用
    const makers = Object.keys(vehicleData);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [availableCodes, setAvailableCodes] = useState<{ code: string, years: string }[]>([]);

    // 外部検索用
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ExternalVehicleData[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 入力ハンドラ
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // 連動プルダウンロジック
        if (name === 'maker') {
            if (vehicleData[value]) {
                setAvailableModels(Object.keys(vehicleData[value]));
            } else {
                setAvailableModels([]);
            }
            setAvailableCodes([]);
            setFormData(prev => ({ ...prev, maker: value, model: '', modelCode: '' }));
        } else if (name === 'model') {
            const currentMaker = formData.maker || (vehicleData[value] ? value : '');
            if (currentMaker && vehicleData[currentMaker] && vehicleData[currentMaker][value]) {
                setAvailableCodes(vehicleData[currentMaker][value]);
            } else {
                setAvailableCodes([]);
            }
            setFormData(prev => ({ ...prev, model: value, modelCode: '' }));
        }
    };

    // ナンバープレート文字列をパースしてステートにセット
    const parseAndSetPlate = (fullPlate: string) => {
        if (!fullPlate) return;
        // 例: "品川 500 あ 1234" または "品川500あ1234"
        // 簡易的なパースロジック
        // 空白で分割できるか試行
        const parts = fullPlate.replace(/\s+/g, ' ').trim().split(' ');
        if (parts.length >= 4) {
            setPlateRegion(PLATE_REGIONS.includes(parts[0]) ? parts[0] : 'その他');
            if (!PLATE_REGIONS.includes(parts[0])) setCustomRegion(parts[0]);
            setPlateClass(parts[1]);
            setPlateHiragana(PLATE_HIRAGANA.includes(parts[2]) ? parts[2] : '');
            setPlateNumber(parts[3]);
        } else {
            // 分割できない場合は適当に割り振る（正規表現で試みる）
            const match = fullPlate.match(/^([^\d]+)(\d{2,3})([あ-ん])(\d{1,4})$/);
            if (match) {
                setPlateRegion(PLATE_REGIONS.includes(match[1]) ? match[1] : 'その他');
                if (!PLATE_REGIONS.includes(match[1])) setCustomRegion(match[1]);
                setPlateClass(match[2]);
                setPlateHiragana(PLATE_HIRAGANA.includes(match[3]) ? match[3] : '');
                setPlateNumber(match[4]);
            } else {
                // 解析不能な場合は備考に入れるなどを検討すべきだが、今回は地域に全突っ込みなどは避ける
                // とりあえず地域だけセットしてあとは空にする、あるいはアラートを出すなど
                // ここでは簡易的に「その他」にしてcustomRegionに入れる
                setPlateRegion('その他');
                setCustomRegion(fullPlate);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // ナンバープレートを結合
        const region = plateRegion === 'その他' ? customRegion : plateRegion;
        const finalPlate = `${region} ${plateClass} ${plateHiragana} ${plateNumber}`.trim();

        onSubmit({
            ...formData,
            plateNumber: finalPlate,
        } as VehicleFormData);
    };

    // ------------------------------------------------------------------
    // スキャン機能
    // ------------------------------------------------------------------
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
            if (data.includes(',')) {
                const parts = data.split(',');
                parsed = {
                    ...parsed,
                    plateNumber: parts[0] || '', // ここで "品川500あ1234" が入る想定
                    maker: parts[1] || '',
                    model: parts[2] || '',
                    modelCode: parts[3] || '',
                    year: parts[4] || '',
                    color: parts[5] || '',
                };
            } else if (data.startsWith('IC-')) {
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
                parsed.plateNumber = data;
            }
        } catch (error) {
            console.error('Scan parse error:', error);
        }

        setShowScanner('none');
        setScannedData(parsed);
    };

    const handleConfirmScan = () => {
        if (!scannedData) return;

        parseAndSetPlate(scannedData.plateNumber);

        setFormData({
            maker: scannedData.maker,
            model: scannedData.model,
            modelCode: scannedData.modelCode || '',
            year: scannedData.year || '',
            color: scannedData.color || '',
            customerName: '',
            notes: `${scannedData.scanType === 'qr' ? 'QRコード' : 'ICタグ'}読取\n${scannedData.rawData || ''}`,
        });
        setScannedData(null);
        setMode('manual');

        // 連動情報の更新
        if (scannedData.maker && vehicleData[scannedData.maker]) {
            setAvailableModels(Object.keys(vehicleData[scannedData.maker]));
            if (scannedData.model && vehicleData[scannedData.maker][scannedData.model]) {
                setAvailableCodes(vehicleData[scannedData.maker][scannedData.model]);
            }
        }
    };

    // ------------------------------------------------------------------
    // 外部連携機能
    // ------------------------------------------------------------------
    const handleExternalSearch = async () => {
        setIsSearching(true);
        try {
            const results = await searchExternalSystem(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            alert('検索中にエラーが発生しました');
        } finally {
            setIsSearching(false);
        }
    };

    const selectExternalData = (data: ExternalVehicleData) => {
        parseAndSetPlate(data.plateNumber);

        setFormData({
            maker: data.maker,
            model: data.model,
            modelCode: data.modelCode,
            year: data.year,
            color: data.color,
            customerName: data.customerName,
            notes: `基幹システム連携: ${data.notes || ''}`,
        });
        setMode('manual');

        // 連動情報の更新
        if (data.maker && vehicleData[data.maker]) {
            setAvailableModels(Object.keys(vehicleData[data.maker]));
            if (data.model && vehicleData[data.maker][data.model]) {
                setAvailableCodes(vehicleData[data.maker][data.model]);
            }
        }
    };

    // ポップアップ等は変更なし
    if (scannedData) {
        return (
            <VehicleScanConfirmation
                data={scannedData}
                onConfirm={handleConfirmScan}
                onCancel={() => setScannedData(null)}
                onEdit={() => {
                    handleConfirmScan();
                }}
            />
        );
    }
    if (showScanner === 'qr') {
        return <QRScanner onScan={(data) => handleScan(data, 'qr')} onClose={() => setShowScanner('none')} />;
    }
    if (showScanner === 'nfc') {
        return <NFCReader onRead={(data) => handleScan(data, 'nfc')} onClose={() => setShowScanner('none')} />;
    }

    // Enterキーでのフォーカス移動
    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = (e.currentTarget as HTMLElement).closest('form');
            if (form) {
                const elements = Array.from(form.querySelectorAll('input, select, textarea, button')) as HTMLElement[];
                const currentIndex = elements.indexOf(e.currentTarget as HTMLElement);
                const nextElement = elements[currentIndex + 1];
                if (nextElement) {
                    nextElement.focus();
                }
            }
        }
    };

    return (
        <div className={styles.formContainer}>
            {/* モード切替タブ */}
            <div className={styles.tabs} style={{ display: 'flex', marginBottom: '1rem', borderBottom: '1px solid #ddd' }}>

                {/* ... Tabs unchanged ... */}
                <button
                    type="button"
                    style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: mode === 'manual' ? '#2196F3' : 'transparent',
                        color: mode === 'manual' ? 'white' : '#666',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        fontWeight: 'bold'
                    }}
                    onClick={() => setMode('manual')}
                >
                    ✍️ 手動入力
                </button>
                <button
                    type="button"
                    style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: mode === 'scan' ? '#2196F3' : 'transparent',
                        color: mode === 'scan' ? 'white' : '#666',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        fontWeight: 'bold'
                    }}
                    onClick={() => setMode('scan')}
                >
                    📸 スキャン
                </button>
                <button
                    type="button"
                    style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: mode === 'external' ? '#2196F3' : 'transparent',
                        color: mode === 'external' ? 'white' : '#666',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        fontWeight: 'bold'
                    }}
                    onClick={() => setMode('external')}
                >
                    🏢 基幹システム検索
                </button>
            </div>

            {/* コンテンツエリア */}
            {mode === 'manual' && (
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>メーカー</label>
                            <select
                                name="maker"
                                className={styles.select}
                                value={formData.maker}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                required
                            >
                                <option value="">メーカーを選択</option>
                                {makers.map(m => <option key={m} value={m}>{m}</option>)}
                                <option value="その他">その他</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>車名</label>
                            {/* 車名：メーカーが選択されていればプルダウン、その他ならテキスト入力 */}
                            {formData.maker && formData.maker !== 'その他' ? (
                                <select
                                    name="model"
                                    className={styles.select}
                                    value={formData.model}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                >
                                    <option value="">車名を選択</option>
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="model"
                                    className={styles.input}
                                    placeholder="プリウス"
                                    value={formData.model}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                />
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>型式</label>
                            {/* 型式：車名が選択されていればプルダウン */}
                            {availableCodes.length > 0 ? (
                                <select
                                    name="modelCode"
                                    className={styles.select}
                                    value={formData.modelCode}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                >
                                    <option value="">型式を選択</option>
                                    {availableCodes.map(c => (
                                        <option key={c.code} value={c.code}>{c.code} ({c.years})</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="modelCode"
                                    className={styles.input}
                                    placeholder="ZVW30"
                                    value={formData.modelCode}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                />
                            )}
                        </div>

                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label className={styles.label}>ナンバープレート</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {/* 地域 */}
                                <div style={{ flex: 2 }}>
                                    <select
                                        className={styles.select}
                                        value={plateRegion}
                                        onChange={(e) => setPlateRegion(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        required
                                    >
                                        <option value="">地域</option>
                                        {PLATE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    {plateRegion === 'その他' && (
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="地域名入力"
                                            value={customRegion}
                                            onChange={(e) => setCustomRegion(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            style={{ marginTop: '0.2rem' }}
                                        />
                                    )}
                                </div>
                                {/* 分類番号 */}
                                <div style={{ flex: 1.5 }}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="500"
                                        value={plateClass}
                                        onChange={(e) => setPlateClass(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        maxLength={3}
                                    />
                                </div>
                                {/* ひらがな */}
                                <div style={{ flex: 1 }}>
                                    <select
                                        className={styles.select}
                                        value={plateHiragana}
                                        onChange={(e) => setPlateHiragana(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    >
                                        <option value="">--</option>
                                        {PLATE_HIRAGANA.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                {/* 一連番号 */}
                                <div style={{ flex: 2 }}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="1234"
                                        value={plateNumber}
                                        onChange={(e) => setPlateNumber(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        maxLength={4}
                                        required
                                    />
                                </div>
                            </div>
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
                                onKeyDown={handleKeyDown}
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
                                onKeyDown={handleKeyDown}
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
                                    onKeyDown={handleKeyDown}
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
                                onKeyDown={handleKeyDown}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelBtn} onClick={onCancel} onKeyDown={handleKeyDown}>
                            キャンセル
                        </button>
                        <button type="submit" className={styles.submitBtn}>
                            登録する
                        </button>
                    </div>
                </form>
            )
            }

            {
                mode === 'scan' && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        {/* ... Scan content unchanged ... */}
                        <p style={{ marginBottom: '1.5rem', color: '#666' }}>車検証のQRコードまたはICタグをスキャンして自動入力します</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexDirection: 'column' }}>
                            <button
                                type="button"
                                className={styles.scanBtn}
                                onClick={() => setShowScanner('qr')}
                                style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}
                            >
                                📸 QRコードを読み取る
                            </button>
                            <button
                                type="button"
                                className={styles.scanBtn}
                                onClick={() => setShowScanner('nfc')}
                                style={{ width: '100%', maxWidth: '300px', margin: '0 auto', marginTop: '1rem' }}
                            >
                                📱 ICタグを読み取る
                            </button>
                        </div>
                    </div>
                )
            }

            {
                mode === 'external' && (
                    <div style={{ padding: '1rem' }}>
                        {/* ... External content unchanged ... */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="ナンバープレート、顧客名など"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                            <button
                                type="button"
                                onClick={handleExternalSearch}
                                disabled={isSearching}
                                style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                {isSearching ? '検索中...' : '検索'}
                            </button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {searchResults.length === 0 && !isSearching && <p style={{ color: '#aaa', textAlign: 'center' }}>データが見つかりません</p>}
                            {searchResults.map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => selectExternalData(item)}
                                    style={{
                                        border: '1px solid #eee',
                                        padding: '0.8rem',
                                        marginBottom: '0.5rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        background: '#fafafa'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold' }}>{item.plateNumber}</div>
                                    <div style={{ fontSize: '0.9em', color: '#555' }}>
                                        {item.maker} {item.model} ({item.modelCode})
                                    </div>
                                    <div style={{ fontSize: '0.8em', color: '#888' }}>
                                        顧客: {item.customerName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
        </div >
    );
}



// 作業割当フォーム
interface WorkAssignmentFormProps {
    industry: 'demolition' | 'auto_repair';
    onSubmit: (data: WorkAssignmentData) => void;
    onCancel: () => void;
    vehicles: any[]; // TODO: Define strict type
    workers: any[];  // TODO: Define strict type
    parts: any[];    // TODO: Define strict type
    services: any[]; // TODO: Define strict type
    initialValues?: Partial<WorkAssignmentData>;
    onSwitchToRegister?: () => void;
}

interface WorkAssignmentData {
    vehicleId: string;
    workerId: string;
    partOrServiceId: string;
    plannedStart: string;
    plannedMinutes: string;
    customTaskTitle?: string;
    customTaskContent?: string;
}

export function WorkAssignmentForm({ industry, onSubmit, onCancel, vehicles, workers, parts, services, initialValues, onSwitchToRegister }: WorkAssignmentFormProps) {
    const [formData, setFormData] = useState<WorkAssignmentData>({
        vehicleId: initialValues?.vehicleId || '',
        workerId: initialValues?.workerId || '',
        partOrServiceId: initialValues?.partOrServiceId || '',
        plannedStart: initialValues?.plannedStart || '09:00',
        plannedMinutes: initialValues?.plannedMinutes || '60',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'vehicleId' && value === 'new') {
            onSwitchToRegister?.();
            return;
        }

        setFormData(prev => {
            const updates: Partial<WorkAssignmentData> = { [name]: value };

            // 作業/部品を選択した時に、標準時間を自動セット
            if (name === 'partOrServiceId') {
                if (value === 'manual') {
                    // 手入力の場合はデフォルト30分（変更可能）
                    updates.plannedMinutes = '30';
                } else {
                    const list = industry === 'demolition' ? parts : services;
                    const selected = list.find(item => item.id.toString() === value);
                    if (selected && selected.default_minutes) {
                        updates.plannedMinutes = selected.default_minutes.toString();
                    }
                }
            }

            return { ...prev, ...updates };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const partsOrServices = industry === 'demolition' ? parts : services;

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
                        <option value="new">➕ 新規車両登録</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.plate_number} {v.model ? `(${v.model})` : ''}
                            </option>
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
                        {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>{industry === 'demolition' ? '部品' : '整備内容'}</label>
                    <select
                        name="partOrServiceId"
                        className={styles.select}
                        value={formData.partOrServiceId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">選択してください</option>
                        <option value="manual">手入力 (時間自由)</option>
                        {partsOrServices.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} ({item.default_minutes}分)
                            </option>
                        ))}
                    </select>
                </div>

                {formData.partOrServiceId === 'manual' && (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>作業名</label>
                            <input
                                type="text"
                                name="customTaskTitle"
                                className={styles.input}
                                placeholder="例: オイル交換"
                                value={formData.customTaskTitle || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label className={styles.label}>作業内容（詳細）</label>
                            <input
                                type="text"
                                name="customTaskContent"
                                className={styles.input}
                                placeholder="例: 5W-30 4L"
                                value={formData.customTaskContent || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </>
                )}



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
