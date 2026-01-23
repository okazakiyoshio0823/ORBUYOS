'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import styles from './QRScanner.module.css';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [error, setError] = useState<string>('');

    const capture = useCallback(() => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext('2d');
                if (context) {
                    context.drawImage(image, 0, 0);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        console.log('QR Code detected:', code.data);
                        // ビープ音
                        const audio = new Audio('/beep.mp3'); // 音ファイルがなければエラーになるだけ
                        audio.play().catch(() => { });

                        onScan(code.data);
                        setIsScanning(false);
                    }
                }
            };
        }
    }, [onScan]);

    useEffect(() => {
        if (!isScanning) return;

        const interval = setInterval(() => {
            capture();
        }, 500); // 0.5秒ごとにスキャン

        return () => clearInterval(interval);
    }, [isScanning, capture]);

    return (
        <div className={styles.container}>
            <div className={styles.cameraWrapper}>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'environment' }} // 背面カメラ優先
                    className={styles.webcam}
                    onUserMediaError={(err) => setError('カメラの起動に失敗しました')}
                />
                <div className={styles.overlay}>
                    <div className={styles.scanArea}></div>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <p className={styles.instruction}>
                車検証のQRコードを枠内に合わせてください
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button className={styles.closeBtn} onClick={onClose}>
                    キャンセル
                </button>
                <button
                    className={styles.closeBtn}
                    style={{ background: '#28a745', color: 'white' }}
                    onClick={() => onScan('品川500あ1234,トヨタ,プリウス,ZVW50,2022,パールホワイト')}
                >
                    📋 デモデータ
                </button>
            </div>
        </div>
    );
}
