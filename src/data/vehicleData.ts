
export interface VehicleModel {
    code: string;
    years: string;
}

export interface VehicleData {
    [manufacturer: string]: {
        [model: string]: VehicleModel[];
    };
}

export const vehicleData: VehicleData = {
    "ダイハツ": {
        "タント": [
            { code: "L350S/L360S", years: "2003-2007" },
            { code: "L375S/L385S", years: "2007-2013" },
            { code: "LA600S/LA610S", years: "2013-2019" },
            { code: "LA650S/LA660S", years: "2019-" }
        ],
        "ムーヴ": [
            { code: "L900S/L910S", years: "1998-2002" },
            { code: "L150S/L160S", years: "2002-2006" },
            { code: "L175S/L185S", years: "2006-2010" },
            { code: "LA100S/LA110S", years: "2010-2014" },
            { code: "LA150S/LA160S", years: "2014-2023" }
        ],
        "ムーヴキャンバス": [
            { code: "LA800S/LA810S", years: "2016-2022" },
            { code: "LA850S/LA860S", years: "2022-" }
        ],
        "ミラ": [
            { code: "L700S/L710S", years: "1998-2002" },
            { code: "L250S/L260S", years: "2002-2006" },
            { code: "L275S/L285S", years: "2006-2018" }
        ],
        "ミライース": [
            { code: "LA300S/LA310S", years: "2011-2017" },
            { code: "LA350S/LA360S", years: "2017-" }
        ],
        "ミラココア": [
            { code: "L675S/L685S", years: "2009-2018" }
        ],
        "ミラトコット": [
            { code: "LA550S/LA560S", years: "2018-" }
        ],
        "タフト": [
            { code: "LA900S/LA910S", years: "2020-" }
        ],
        "ロッキー": [
            { code: "A200S/A210S", years: "2019-" },
            { code: "A202S", years: "2021-" }
        ],
        "アトレー": [
            { code: "S220G/S230G", years: "1999-2005" },
            { code: "S320G/S330G", years: "2005-2007" },
            { code: "S321G/S331G", years: "2007-2021" },
            { code: "S700V/S710V", years: "2021-" }
        ],
        "ハイゼットカーゴ": [
            { code: "S200V/S210V", years: "1999-2004" },
            { code: "S320V/S330V", years: "2004-2007" },
            { code: "S321V/S331V", years: "2007-2021" },
            { code: "S700V/S710V", years: "2021-" }
        ],
        "ハイゼットトラック": [
            { code: "S200P/S210P", years: "1999-2014" },
            { code: "S500P/S510P", years: "2014-" }
        ],
        "コペン": [
            { code: "L880K", years: "2002-2012" },
            { code: "LA400K", years: "2014-" }
        ],
        "ウェイク": [
            { code: "LA700S/LA710S", years: "2014-2022" }
        ],
        "キャスト": [
            { code: "LA250S/LA260S", years: "2015-2023" }
        ],
        "トール": [
            { code: "M900S/M910S", years: "2016-" }
        ],
        "ブーン": [
            { code: "M300S", years: "2004-2010" },
            { code: "M600S", years: "2010-2016" },
            { code: "M700S", years: "2016-2023" }
        ]
    },
    "トヨタ": {
        "プリウス": [
            { code: "NHW10/11", years: "1997-2003" },
            { code: "NHW20", years: "2003-2009" },
            { code: "ZVW30", years: "2009-2015" },
            { code: "ZVW50/51/55", years: "2015-2022" },
            { code: "MXWH60/65", years: "2023-" }
        ],
        "プリウスα": [
            { code: "ZVW40W/41W", years: "2011-2021" }
        ],
        "アクア": [
            { code: "NHP10", years: "2011-2021" },
            { code: "MXPK10/11", years: "2021-" }
        ],
        "ヤリス": [
            { code: "MXPA10/15", years: "2020-" },
            { code: "MXPH10/15", years: "2020-" },
            { code: "KSP210", years: "2020-" }
        ],
        "ヤリスクロス": [
            { code: "MXPB10/15", years: "2020-" },
            { code: "MXPJ10/15", years: "2020-" }
        ],
        "ヴィッツ": [
            { code: "SCP10/NCP10", years: "1999-2005" },
            { code: "SCP90/NCP91", years: "2005-2010" },
            { code: "KSP130/NSP130", years: "2010-2020" }
        ],
        "カローラ": [
            { code: "NZE121", years: "2000-2006" },
            { code: "NZE141", years: "2006-2012" },
            { code: "NZE161", years: "2012-2019" },
            { code: "ZRE212/ZWE211", years: "2019-" }
        ],
        "クラウン": [
            { code: "JZS171", years: "1999-2003" },
            { code: "GRS180", years: "2003-2008" },
            { code: "GRS200", years: "2008-2012" },
            { code: "GRS210/AWS210", years: "2012-2018" },
            { code: "ARS220/GWS224", years: "2018-2022" },
            { code: "TZSH35/AZSH30", years: "2022-" }
        ],
        "ノア": [
            { code: "AZR60G", years: "2001-2007" },
            { code: "ZRR70G/W", years: "2007-2014" },
            { code: "ZRR80G/W", years: "2014-2021" },
            { code: "MZRA90W/ZWR90W", years: "2022-" }
        ],
        "ヴォクシー": [
            { code: "AZR60G", years: "2001-2007" },
            { code: "ZRR70G/W", years: "2007-2014" },
            { code: "ZRR80G/W", years: "2014-2021" },
            { code: "MZRA90W/ZWR90W", years: "2022-" }
        ],
        "アルファード": [
            { code: "ANH10W/MNH10W", years: "2002-2008" },
            { code: "ANH20W/GGH20W", years: "2008-2015" },
            { code: "AGH30W/GGH30W", years: "2015-2023" },
            { code: "AGH40W/AAHH40W", years: "2023-" }
        ],
        "ヴェルファイア": [
            { code: "ANH20W/GGH20W", years: "2008-2015" },
            { code: "AGH30W/GGH30W", years: "2015-2023" },
            { code: "TAHA40W/AAHH40W", years: "2023-" }
        ],
        "ハリアー": [
            { code: "ACU30W/MCU30W", years: "2003-2013" },
            { code: "ZSU60W/AVU65W", years: "2013-2020" },
            { code: "MXUA80/AXUH80", years: "2020-" }
        ],
        "RAV4": [
            { code: "ACA31W", years: "2005-2016" },
            { code: "MXAA52/54", years: "2019-" }
        ],
        "ランドクルーザープラド": [
            { code: "RZJ90W/95W", years: "1996-2002" },
            { code: "TRJ120W", years: "2002-2009" },
            { code: "TRJ150W/GDJ150W", years: "2009-2024" }
        ],
        "ハイエース": [
            { code: "H100系", years: "1989-2004" },
            { code: "TRH200V/KDH200V", years: "2004-" }
        ],
        "シエンタ": [
            { code: "NCP81G", years: "2003-2015" },
            { code: "NSP170G/NHP170G", years: "2015-2022" },
            { code: "MXPC10G/MXPL10G", years: "2022-" }
        ],
        "ルーミー": [
            { code: "M900A/M910A", years: "2016-" }
        ],
        "ライズ": [
            { code: "A200A/A210A", years: "2019-" }
        ],
        "C-HR": [
            { code: "NGX50/ZYX10", years: "2016-2023" }
        ]
    },
    "ホンダ": {
        "フィット": [
            { code: "GD1/2/3/4", years: "2001-2007" },
            { code: "GE6/7/8/9", years: "2007-2013" },
            { code: "GK3/4/5/6", years: "2013-2020" },
            { code: "GR1/2/3/4", years: "2020-" }
        ],
        "N-BOX": [
            { code: "JF1/2", years: "2011-2017" },
            { code: "JF3/4", years: "2017-2023" },
            { code: "JF5/6", years: "2023-" }
        ],
        "フリード": [
            { code: "GB3/4", years: "2008-2016" },
            { code: "GB5/6/7/8", years: "2016-2024" },
            { code: "GT1/2/3/4", years: "2024-" }
        ],
        "ステップワゴン": [
            { code: "RF3/4", years: "2001-2005" },
            { code: "RG1/2", years: "2005-2009" },
            { code: "RK1/2/5/6", years: "2009-2015" },
            { code: "RP1/2/3/4", years: "2015-2022" },
            { code: "RP6/7/8", years: "2022-" }
        ],
        "ヴェゼル": [
            { code: "RU1/2/3/4", years: "2013-2021" },
            { code: "RV3/4/5/6", years: "2021-" }
        ],
        "オデッセイ": [
            { code: "RA6/7/8/9", years: "1999-2003" },
            { code: "RB1/2", years: "2003-2008" },
            { code: "RB3/4", years: "2008-2013" },
            { code: "RC1/2/4", years: "2013-2022" }
        ],
        "シビック": [
            { code: "EU", years: "2000-2005" },
            { code: "FD", years: "2005-2010" },
            { code: "FK7/FC1", years: "2017-2021" },
            { code: "FL1/4", years: "2021-" }
        ],
        "ライフ": [
            { code: "JB1/2", years: "1998-2003" },
            { code: "JB5/6/7/8", years: "2003-2008" },
            { code: "JC1/2", years: "2008-2014" }
        ],
        "N-WGN": [
            { code: "JH1/2", years: "2013-2019" },
            { code: "JH3/4", years: "2019-" }
        ],
        "N-ONE": [
            { code: "JG1/2", years: "2012-2020" },
            { code: "JG3/4", years: "2020-" }
        ]
    },
    "日産": {
        "セレナ": [
            { code: "C24", years: "1999-2005" },
            { code: "C25", years: "2005-2010" },
            { code: "C26", years: "2010-2016" },
            { code: "C27", years: "2016-2022" },
            { code: "C28", years: "2022-" }
        ],
        "ノート": [
            { code: "E11", years: "2005-2012" },
            { code: "E12", years: "2012-2020" },
            { code: "E13", years: "2020-" }
        ],
        "エクストレイル": [
            { code: "T30", years: "2000-2007" },
            { code: "T31", years: "2007-2013" },
            { code: "T32", years: "2013-2022" },
            { code: "T33", years: "2022-" }
        ],
        "デイズ": [
            { code: "B21W", years: "2013-2019" },
            { code: "B40W", years: "2019-" }
        ],
        "ルークス": [
            { code: "ML21S", years: "2009-2013" },
            { code: "B40A", years: "2020-" }
        ],
        "デイズルークス": [
            { code: "B21A", years: "2014-2020" }
        ],
        "キックス": [
            { code: "P15", years: "2020-" }
        ],
        "エルグランド": [
            { code: "E50", years: "1997-2002" },
            { code: "E51", years: "2002-2010" },
            { code: "E52", years: "2010-" }
        ],
        "キャラバン": [
            { code: "E25", years: "2001-2012" },
            { code: "NV350 (E26)", years: "2012-" }
        ],
        "スカイライン": [
            { code: "R34", years: "1998-2001" },
            { code: "V35", years: "2001-2006" },
            { code: "V36", years: "2006-2014" },
            { code: "V37", years: "2014-" }
        ]
    },
    "スズキ": {
        "ワゴンR": [
            { code: "MC21S/22S", years: "1998-2003" },
            { code: "MH21S/22S", years: "2003-2008" },
            { code: "MH23S", years: "2008-2012" },
            { code: "MH34S/44S", years: "2012-2017" },
            { code: "MH35S/55S/85S", years: "2017-" }
        ],
        "スペーシア": [
            { code: "MK32S/42S", years: "2013-2017" },
            { code: "MK53S", years: "2017-2023" },
            { code: "MK94S", years: "2023-" }
        ],
        "ハスラー": [
            { code: "MR31S/41S", years: "2014-2020" },
            { code: "MR52S/92S", years: "2020-" }
        ],
        "アルト": [
            { code: "HA23S", years: "1998-2004" },
            { code: "HA24S", years: "2004-2009" },
            { code: "HA25S", years: "2009-2014" },
            { code: "HA36S", years: "2014-2021" },
            { code: "HA37S/97S", years: "2021-" }
        ],
        "ジムニー": [
            { code: "JB23W", years: "1998-2018" },
            { code: "JB64W", years: "2018-" }
        ],
        "ジムニーシエラ": [
            { code: "JB43W", years: "2002-2018" },
            { code: "JB74W", years: "2018-" }
        ],
        "スイフト": [
            { code: "ZC11S/21S", years: "2004-2010" },
            { code: "ZC72S/32S", years: "2010-2016" },
            { code: "ZC13S/53S/83S", years: "2017-2023" },
            { code: "ZCEDS/ZCDDS", years: "2023-" }
        ],
        "ソリオ": [
            { code: "MA15S", years: "2011-2015" },
            { code: "MA26S/36S/46S", years: "2015-2020" },
            { code: "MA27S/37S", years: "2020-" }
        ],
        "エブリイ": [
            { code: "DA62V/W", years: "2001-2005" },
            { code: "DA64V/W", years: "2005-2015" },
            { code: "DA17V/W", years: "2015-" }
        ],
        "ラパン": [
            { code: "HE21S", years: "2002-2008" },
            { code: "HE22S", years: "2008-2015" },
            { code: "HE33S", years: "2015-" }
        ]
    },
    "マツダ": {
        "CX-5": [
            { code: "KE系", years: "2012-2017" },
            { code: "KF系", years: "2017-" }
        ],
        "CX-3": [
            { code: "DK系", years: "2015-" }
        ],
        "CX-30": [
            { code: "DM系", years: "2019-" }
        ],
        "CX-8": [
            { code: "KG系", years: "2017-2023" }
        ],
        "CX-60": [
            { code: "KH系", years: "2022-" }
        ],
        "デミオ/MAZDA2": [
            { code: "DY系", years: "2002-2007" },
            { code: "DE系", years: "2007-2014" },
            { code: "DJ系", years: "2014-" }
        ],
        "アクセラ/MAZDA3": [
            { code: "BK系", years: "2003-2009" },
            { code: "BL系", years: "2009-2013" },
            { code: "BM/BY系", years: "2013-2019" },
            { code: "BP系", years: "2019-" }
        ],
        "アテンザ/MAZDA6": [
            { code: "GG/GY系", years: "2002-2008" },
            { code: "GH系", years: "2008-2012" },
            { code: "GJ系", years: "2012-2024" }
        ],
        "ロードスター": [
            { code: "NB系", years: "1998-2005" },
            { code: "NC系", years: "2005-2015" },
            { code: "ND系", years: "2015-" }
        ]
    },
    "スバル": {
        "レヴォーグ": [
            { code: "VM", years: "2014-2020" },
            { code: "VN", years: "2020-" }
        ],
        "インプレッサ": [
            { code: "GD/GG", years: "2000-2007" },
            { code: "GH/GR", years: "2007-2011" },
            { code: "GP/GJ", years: "2011-2016" },
            { code: "GT/GK", years: "2016-2023" },
            { code: "GU", years: "2023-" }
        ],
        "フォレスター": [
            { code: "SG", years: "2002-2007" },
            { code: "SH", years: "2007-2012" },
            { code: "SJ", years: "2012-2018" },
            { code: "SK", years: "2018-" }
        ],
        "レガシィ": [
            { code: "BH/BE", years: "1998-2003" },
            { code: "BP/BL", years: "2003-2009" },
            { code: "BR/BM", years: "2009-2014" },
            { code: "BS/BN", years: "2014-2021" }
        ],
        "XV/クロストレック": [
            { code: "GP", years: "2012-2017" },
            { code: "GT", years: "2017-2023" },
            { code: "GU", years: "2023-" }
        ]
    },
    "三菱": {
        "デリカD:5": [
            { code: "CV1W/2W/4W/5W", years: "2007-" }
        ],
        "アウトランダーPHEV": [
            { code: "GG2W/3W", years: "2013-2021" },
            { code: "GN0W", years: "2021-" }
        ],
        "eKワゴン/クロス": [
            { code: "H81W", years: "2001-2006" },
            { code: "H82W", years: "2006-2013" },
            { code: "B11W", years: "2013-2019" },
            { code: "B33W/36W", years: "2019-" }
        ],
        "パジェロミニ": [
            { code: "H58A", years: "1998-2012" }
        ]
    }
};
