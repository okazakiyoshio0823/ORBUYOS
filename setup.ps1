# ORBIYOS ワンクリックセットアップスクリプト
# PowerShell版

param(
    [switch]$SkipBrowser
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================"
Write-Host "  ORBIYOS ワンクリックセットアップ"
Write-Host "========================================`n"

# サーバー稼働チェック (リカバリー機能)
$port = 3000
$isListening = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($isListening) {
    Write-Host "⚡ ORBIYOSは既に起動しています！" -ForegroundColor Green
    Write-Host "ブラウザを再度開きます...`n"
    
    Start-Process "http://localhost:3000"
    
    Write-Host "========================================"
    Write-Host "  リカバリー完了"
    Write-Host "========================================`n"
    Write-Host "誤ってブラウザを閉じた場合も、このファイルを"
    Write-Host "もう一度実行すればすぐに復帰できます。`n"
    
    Write-Host "何かキーを押すと終了します..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

# プロジェクトディレクトリチェック
if (Test-Path "package.json") {
    Write-Host "✓ プロジェクトフォルダを検出しました" -ForegroundColor Green
}
else {
    # Gitチェック
    $gitInstalled = Get-Command git -ErrorAction SilentlyContinue
    
    if ($gitInstalled) {
        Write-Host "✓ Gitが検出されました" -ForegroundColor Green
        Write-Host "`nプロジェクトをクローンしています...`n"
        
        git clone https://github.com/okazakiyoshio0823/ORBUYOS.git orbiyos
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ クローンに失敗しました" -ForegroundColor Red
            exit 1
        }
        Set-Location orbiyos
    }
    else {
        Write-Host "⚠ Gitが見つかりませんので、ZIPダウンロードモードで実行します" -ForegroundColor Yellow
        Write-Host "`nプロジェクトをダウンロードしています...`n"
        
        try {
            $zipUrl = "https://github.com/okazakiyoshio0823/ORBUYOS/archive/refs/heads/main.zip"
            $zipFile = "orbiyos.zip"
            
            Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
            
            if (-not (Test-Path $zipFile)) {
                throw "ダウンロードファイルが見つかりません"
            }
            
            Write-Host "解凍しています..."
            Expand-Archive -Path $zipFile -DestinationPath "." -Force
            
            # GitHub zip extracts to ORBUYOS-main, rename it to orbiyos
            if (Test-Path "ORBUYOS-main") {
                if (Test-Path "orbiyos") {
                    Remove-Item "orbiyos" -Recurse -Force
                }
                Rename-Item "ORBUYOS-main" "orbiyos"
                Set-Location orbiyos
            }
            else {
                throw "解凍後のフォルダ(ORBUYOS-main)が見つかりません"
            }
            
            Remove-Item "..\$zipFile" -Force
        }
        catch {
            Write-Host "✗ ダウンロードまたは解凍に失敗しました: $_" -ForegroundColor Red
            # 詳細エラー情報を表示
            Write-Host $_.ScriptStackTrace -ForegroundColor Gray
            pause
            exit 1
        }
    }
}

# npmチェック
$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmInstalled) {
    Write-Host "✗ npmが見つかりません" -ForegroundColor Red
    Write-Host "`nNode.jsをインストールしてください:"
    Write-Host "https://nodejs.org/`n"
    pause
    exit 1
}

# 実行ポリシー設定
Write-Host "`nPowerShell実行ポリシーを設定中..." -ForegroundColor Cyan
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# 依存関係インストール
Write-Host "`n========================================"
Write-Host "  依存関係をインストール中..."
Write-Host "========================================`n"

Write-Host "npm install を実行中...`n" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ インストールに失敗しました" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ インストール完了！" -ForegroundColor Green

# 開発サーバー起動
Write-Host "`n========================================"
Write-Host "  開発サーバーを起動中..."
Write-Host "========================================`n"

Write-Host "起動中... (数秒お待ちください)`n" -ForegroundColor Cyan

# バックグラウンドでサーバー起動
$job = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    npm run dev
} -ArgumentList (Get-Location).Path

# サーバー起動待機
Write-Host "サーバーの起動を待っています..." -ForegroundColor Cyan
$attempts = 0
$maxAttempts = 20

while ($attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ サーバーが起動しました！" -ForegroundColor Green
            break
        }
    }
    catch {
        # Server not ready yet
    }
    $attempts++
}

if ($attempts -ge $maxAttempts) {
    Write-Host "⚠ サーバーの起動に時間がかかっています..." -ForegroundColor Yellow
    Write-Host "手動で確認してください: http://localhost:3000"
}

# ブラウザを開く
if (-not $SkipBrowser) {
    Write-Host "`n========================================"
    Write-Host "  ブラウザを起動中..."
    Write-Host "========================================`n"
    
    Start-Process "http://localhost:3000"
}

Write-Host "`n========================================"
Write-Host "  セットアップ完了！"
Write-Host "========================================`n"

Write-Host "✓ ORBIYOSが起動しました" -ForegroundColor Green
Write-Host "✓ ブラウザが自動で開きます" -ForegroundColor Green
Write-Host "`nURL: http://localhost:3000`n"
Write-Host "サーバーを停止するには、Ctrl+C を押してください`n"

# Keep script running to show server output
Receive-Job -Job $job -Wait
