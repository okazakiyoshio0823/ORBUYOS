'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
    onCommand: (command: VoiceCommand) => void;
    industry?: 'demolition' | 'auto_repair';
}

export interface VoiceCommand {
    type: 'start' | 'end' | 'pause' | 'memo' | 'schedule_create' | 'unknown';
    time?: string;
    target?: string;
    memo?: string;
    workerName?: string;
    vehicleName?: string;
    partName?: string;
    raw: string;
}

// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

export function VoiceInput({ onCommand }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    // AIモード関連
    const [useAI, setUseAI] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    // 録音データ保持用Ref
    const audioChunksRef = useRef<Blob[]>([]);

    // 音声認識の初期化
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = false;
                recognitionInstance.interimResults = true;
                recognitionInstance.lang = 'ja-JP';
                setRecognition(recognitionInstance);
            }
        }
    }, []);

    // コマンド解析（自然言語対応）
    const parseCommand = useCallback((text: string): VoiceCommand => {
        const normalized = text.toLowerCase().replace(/\s+/g, '');

        // 時間パターン（9時、10時半など）
        const timePattern = /(\d{1,2})時(半)?/;
        const timeMatch = text.match(timePattern);
        const time = timeMatch
            ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] ? '30' : '00'}`
            : undefined;

        // カレンダー登録コマンド（「登録」「カレンダー入力」「追加」「予定」）
        if (normalized.includes('登録') || normalized.includes('カレンダー入力') ||
            normalized.includes('追加') || normalized.includes('予定入力')) {

            // 作業者名を抽出（一般的な日本人名パターン）
            const namePattern = /([一-龯]{1,3})\s*([一-龯]{1,3})/;
            const nameMatch = text.match(namePattern);
            const workerName = nameMatch ? `${nameMatch[1]} ${nameMatch[2]}`.replace(/\s+/g, ' ').trim() : undefined;

            // 車名を抽出（一般的な車種名）
            const carNames = ['プリウス', 'アクア', 'ヤリス', 'カローラ', 'クラウン', 'ノア', 'ヴォクシー',
                'アルファード', 'ヴェルファイア', 'ハリアー', 'ランドクルーザー', 'フィット',
                'ヴェゼル', 'ステップワゴン', 'フリード', 'N-BOX', 'タント', 'ムーヴ',
                'ワゴンR', 'スイフト', 'ジムニー', 'デリカ', 'アウトランダー'];
            const vehicleName = carNames.find(car => text.includes(car));

            // 部品名を抽出
            const partNames = ['エンジン', 'ミッション', 'ドア', 'バンパー', 'ボンネット', 'トランク',
                'ヘッドライト', 'テールランプ', '足回り', 'シート', 'ダッシュボード',
                'ステアリング', 'タイヤ', 'ブレーキ', 'オイル', 'バッテリー', '車検',
                '点検', '整備'];
            const partName = partNames.find(part => text.includes(part));

            return {
                type: 'schedule_create',
                time,
                workerName,
                vehicleName,
                partName,
                raw: text
            };
        }

        // 開始コマンド
        if (normalized.includes('開始') || normalized.includes('スタート') || normalized.includes('はじめ')) {
            return { type: 'start', time, raw: text };
        }

        // 終了/完了コマンド
        if (normalized.includes('終了') || normalized.includes('完了') || normalized.includes('おわり')) {
            return { type: 'end', time, raw: text };
        }

        // 中断コマンド
        if (normalized.includes('中断') || normalized.includes('ストップ') || normalized.includes('休憩')) {
            return { type: 'pause', time, raw: text };
        }

        // メモコマンド
        if (normalized.includes('メモ') || normalized.includes('備考')) {
            const memoContent = text.replace(/メモ|備考/g, '').trim();
            return { type: 'memo', memo: memoContent, raw: text };
        }

        return { type: 'unknown', raw: text };
    }, []);

    // ■ 通常モード：Web Speech API
    const startWebSpeech = useCallback(() => {
        if (!recognition) return;

        recognition.onstart = () => { setIsListening(true); setTranscript(''); };
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) finalTranscript += result[0].transcript;
                else interimTranscript += result[0].transcript;
            }
            setTranscript(interimTranscript || finalTranscript);
            if (finalTranscript) {
                const command = parseCommand(finalTranscript);
                onCommand(command);
            }
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    }, [recognition, parseCommand, onCommand]);

    const stopWebSpeech = useCallback(() => {
        recognition?.stop();
    }, [recognition]);

    // ■ AIモード：Whisper API
    const sendToWhisper = async (file: Blob) => {
        const formData = new FormData();
        formData.append('file', file, 'audio.webm');

        try {
            const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.text) {
                setTranscript(data.text);
                const command = parseCommand(data.text);
                onCommand(command);

                if (data.isMock) {
                    alert('（デモ）APIキーが設定されていないため、モック応答を表示しました:\n' + data.text);
                }
            } else {
                setTranscript('認識できませんでした');
            }
        } catch (error) {
            console.error('Whisper API Error:', error);
            setTranscript('エラーが発生しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await sendToWhisper(audioBlob);
            };

            recorder.start();
            setIsListening(true);
            setTranscript('録音中...');
        } catch (error) {
            console.error('Mic error:', error);
            alert('マイクを使用できませんでした: ' + error);
            setIsListening(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsListening(false);
            setTranscript('AI解析中...');
            setIsProcessing(true);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            if (useAI) stopRecording();
            else stopWebSpeech();
        } else {
            if (useAI) startRecording();
            else startWebSpeech();
        }
    };

    if (!isSupported && !useAI) {
        return (
            <div className={styles.unsupported}>
                Web Speech APIは非対応ですが、AIモードなら利用可能です。
                <button onClick={() => setUseAI(true)} style={{ marginLeft: 10 }}>AIモードへ切り替え</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>🎤 音声入力</h3>
                <div className={styles.toggleWrapper}>
                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={useAI}
                            onChange={(e) => setUseAI(e.target.checked)}
                        />
                        <span className={styles.slider}></span>
                    </label>
                    <span className={styles.modeLabel}>{useAI ? 'AIモード(Whisper)' : '通常モード'}</span>
                </div>
            </div>

            <div className={styles.controls}>
                <button
                    className={`${styles.micButton} ${isListening ? styles.listening : ''} ${isProcessing ? styles.processing : ''}`}
                    onClick={!isProcessing ? toggleListening : undefined}
                    disabled={isProcessing}
                    title={useAI ? "クリックして録音開始・終了" : "クリックして認識開始・終了"}
                >
                    {isProcessing ? '⏳ 解析中...' : (isListening ? '🟥 停止' : '🎤 話す')}
                </button>
            </div>

            {transcript && (
                <div className={styles.transcript}>
                    <span className={styles.label}>{isProcessing ? 'AI解析中...' : '認識:'}</span>
                    <span className={styles.text}>{transcript}</span>
                </div>
            )}

            <div className={styles.examples}>
                <p className={styles.exampleTitle}>コマンド例:</p>
                <ul>
                    <li>「9時 スタート」→ 9:00の作業を開始</li>
                    <li>「完了」→ 現在の作業を完了</li>
                    <li>「メモ ボルト固着」→ 備考を追加</li>
                </ul>
            </div>
        </div>
    );
}
