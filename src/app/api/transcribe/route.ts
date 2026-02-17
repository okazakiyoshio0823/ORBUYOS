import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Node.jsランタイムを使用

// OpenAI APIの設定
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // APIキーがない場合はデモモード（モック）で動作
        if (!OPENAI_API_KEY) {
            console.log('OpenAI API Key not found. Using mock response.');

            // 1秒待ってそれっぽいレスポンスを返す（デモ用）
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ランダムにコマンドを返す（デモ）
            const mockCommands = [
                '9時スタート',
                '10時半 整備終了',
                'メモ、バンパーに傷あり',
                '作業完了報告'
            ];
            const randomCommand = mockCommands[Math.floor(Math.random() * mockCommands.length)];

            return NextResponse.json({
                text: randomCommand,
                isMock: true,
                message: 'OpenAI APIキーが設定されていないため、モック応答を返しました。'
            });
        }

        // FormDataを再構築してOpenAIへ送信
        const apiFormData = new FormData();
        apiFormData.append('file', file);
        apiFormData.append('model', 'whisper-1');
        apiFormData.append('language', 'ja'); // 日本語指定

        console.log('Sending audio to OpenAI Whisper API...');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: apiFormData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return NextResponse.json({ error: 'OpenAI API Error', details: errorData }, { status: 500 });
        }

        const data = await response.json();
        console.log('Transcription result:', data.text);

        return NextResponse.json({ text: data.text });

    } catch (error) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
