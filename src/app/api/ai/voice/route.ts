import { NextResponse } from 'next/server';

// POST /api/ai/voice
// モックAIエンドポイント: 受け取ったテキスト(transcript)を解析し、アクション(Intent)をJSONで返す
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, industry } = body;

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log(`[AI Voice API] Received transcript: "${transcript}", Industry: ${industry}`);

    // ==========================================
    // 高度なLLMモック処理（ルールベース拡張）
    // 実際の運用ではここでOpenAI API等を呼び出しますが、
    // 今回はモックとして強力なルールエンジンを実装します。
    // ==========================================
    
    const normalized = transcript.toLowerCase().replace(/\s+/g, '');
    let action = 'unknown';
    let data: any = {};

    // 1. 時間の抽出
    const timePattern = /(\d{1,2})時(半)?/;
    const timeMatch = transcript.match(timePattern);
    if (timeMatch) {
      data.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] ? '30' : '00'}`;
    }

    // 2. 名前の抽出
    const namePattern = /([一-龯]{1,3})\s*([一-龯]{1,3})/;
    const nameMatch = transcript.match(namePattern);
    if (nameMatch) {
       data.workerName = `${nameMatch[1]} ${nameMatch[2]}`.trim();
    } else {
       // 苗字だけの簡易マッチ
       const commonNames = ['山田', '佐藤', '田中', '鈴木', '高橋', '渡辺', '伊藤'];
       const foundName = commonNames.find(name => transcript.includes(name));
       if (foundName) {
           data.workerName = foundName + 'さん'; // フロントで曖昧検索するため
       }
    }

    // 3. 車両名の抽出
    const carNames = ['プリウス', 'アクア', 'ヤリス', 'カローラ', 'クラウン', 'ノア', 'ヴォクシー', 'アルファード', 'フィット', 'ステップワゴン', 'タント', 'ワゴンr'];
    const vehicleName = carNames.find(car => normalized.includes(car));
    if (vehicleName) data.vehicleName = vehicleName;

    // 4. 部品/作業名の抽出
    const partNames = ['エンジン', 'ミッション', 'ドア', 'バンパー', '車検', '点検', '整備', 'オイル交換', 'ブレーキ'];
    const partName = partNames.find(part => normalized.includes(part));
    if (partName) data.partName = partName;

    // インテント（意図）の判定
    if (normalized.includes('登録') || normalized.includes('カレンダー入力') || normalized.includes('追加') || normalized.includes('予定入力') || normalized.includes('お願い')) {
      action = 'schedule_create';
      if (!data.title) {
          data.title = data.partName || (industry === 'demolition' ? '部品取外' : '整備作業');
      }
    } else if (normalized.includes('開始') || normalized.includes('スタート')) {
      action = 'start';
    } else if (normalized.includes('終了') || normalized.includes('完了') || normalized.includes('終わった')) {
      action = 'end';
    } else if (normalized.includes('中断') || normalized.includes('ストップ')) {
      action = 'pause';
    } else if (normalized.includes('在庫') || normalized.includes('部品を取った')) {
      action = 'add_inventory';
    }

    // AIからの応答メッセージ（フロントエンドで音声合成やトーストに使う）
    let replyMessage = `音声を解析しました（アクション: ${action}）`;
    if (action === 'schedule_create') {
        replyMessage = `${data.workerName || '担当者'}に${data.vehicleName || '車両'}の作業を割り当てます。`;
    } else if (action === 'start') {
        replyMessage = `作業を開始します。`;
    } else if (action === 'end') {
        replyMessage = `作業完了を記録しました。お疲れ様でした。`;
    }

    // モックの遅延を入れてAIっぽくする
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      data: {
        action,
        payload: data,
        replyMessage,
        rawTranscript: transcript
      }
    });

  } catch (error) {
    console.error('AI Voice API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
}
