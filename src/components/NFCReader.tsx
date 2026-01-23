'use client';

import { useState, useEffect } from 'react';
import styles from './NFCReader.module.css';

interface NFCReaderProps {
    onRead: (data: string) => void;
    onClose: () => void;
}

export function NFCReader({ onRead, onClose }: NFCReaderProps) {
    const [status, setStatus] = useState<'idle' | 'scanning' | 'reading' | 'error'>('idle');
    const [message, setMessage] = useState('「スキャン開始」ボタンを押してください');
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (!('NDEFReader' in window)) {
            setIsSupported(false);
            setMessage('お使いの端末はNFCに対応していないか、Web NFCが無効になっています。');
            setStatus('error');
        }
    }, []);

    const startScanning = async () => {
        try {
            // @ts-ignore - NDEFReader型定義がまだ標準でない場合があるため
            const ndef = new window.NDEFReader();

            setStatus('scanning');
            setMessage('車検証のICタグを端末の背面に近づけてください...');

            await ndef.scan();

            ndef.onreading = (event: any) => {
                const serialNumber = event.serialNumber;
                console.log("NFC Serial Number:", serialNumber);

                // 実際の電子車検証データは暗号化されていますが、
                // ここではデモとしてシリアル番号やレコードを使用します

                // ビープ音
                const audio = new Audio('/beep.mp3');
                audio.play().catch(() => { });

                setStatus('reading');
                setMessage('読み取り成功！');

                // 成功としてコールバック
                // デモ用データとして車台番号風のIDを返す
                setTimeout(() => {
                    onRead(`IC-${serialNumber || 'UNKNOWN'}`);
                }, 500);
            };

            ndef.onreadingerror = () => {
                setMessage('読み取りエラーが発生しました。もう一度お試しください。');
                setStatus('error');
            };

        } catch (error) {
            console.error("NFC Scan Error:", error);
            setStatus('error');
            setMessage('NFCスキャンを開始できませんでした。' + error);
        }
    };

    if (!isSupported) {
        return (
            <div className={styles.container}>
                <div className={styles.icon}>⚠️</div>
                <p className={styles.message}>{message}</p>
                <button className={styles.closeBtn} onClick={onClose}>閉じる</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.icon} ${status === 'scanning' ? styles.pulse : ''}`}>
                📱
            </div>

            <h3 className={styles.title}>ICタグ読み取り</h3>
            <p className={styles.message}>{message}</p>

            {status === 'idle' && (
                <button className={styles.scanBtn} onClick={startScanning}>
                    スキャン開始
                </button>
            )}

            {status === 'scanning' && (
                <div className={styles.scanningAnim}>
                    <div className={styles.wave}></div>
                    <div className={styles.wave}></div>
                </div>
            )}

            <button className={styles.closeBtn} onClick={onClose}>
                キャンセル
            </button>
        </div>
    );
}
