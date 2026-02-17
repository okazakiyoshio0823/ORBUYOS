
// 外部基幹システム連携モック

export interface ExternalVehicleData {
    plateNumber: string;
    maker: string;
    model: string;
    modelCode: string;
    year: string;
    color: string;
    customerName: string;
    lastServiceDate?: string;
    notes?: string;
}

// モックデータベース
const mockDatabase: ExternalVehicleData[] = [
    {
        plateNumber: "品川 300 あ 1234",
        maker: "トヨタ",
        model: "プリウス",
        modelCode: "ZVW30",
        year: "2012",
        color: "シルバー",
        customerName: "既存 顧客A",
        lastServiceDate: "2024/01/15",
        notes: "過去に左ドア修理歴あり"
    },
    {
        plateNumber: "練馬 500 い 5678",
        maker: "ホンダ",
        model: "N-BOX",
        modelCode: "JF3",
        year: "2019",
        color: "ブラック",
        customerName: "既存 顧客B",
        lastServiceDate: "2024/06/20",
        notes: "オイル交換サイクル早め"
    },
    {
        plateNumber: "足立 400 う 9999",
        maker: "日産",
        model: "セレナ",
        modelCode: "C27",
        year: "2018",
        color: "ホワイトパール",
        customerName: "既存 顧客C",
        lastServiceDate: "2023/12/10",
        notes: "特になし"
    }
];

export async function searchExternalSystem(query: string): Promise<ExternalVehicleData[]> {
    // APIコールの遅延をシミュレート
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!query) return [];

    // ナンバープレートや車種で検索（部分一致）
    return mockDatabase.filter(v =>
        v.plateNumber.includes(query) ||
        v.model.includes(query) ||
        v.customerName.includes(query)
    );
}
