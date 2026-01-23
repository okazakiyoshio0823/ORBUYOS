# ORBIYOS ワンクリックセットアップスクリプト
# PowerShell版
param(
    [switch]$SkipBrowser
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================"
Write-Host "  ORBIYOS ワンクリックセットアップ"
Write-Host "========================================`n"

# プロジェクトディレクトリチェック
if (Test-Path "package.json") {
    Write-Host "✓ プロジェクトフォルダを検出しました" -ForegroundColor Green
} else {
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
    } else {
        Write-Host "⚠ Gitが見つかりません" -ForegroundColor Yellow
        Write-Host "`n以下のいずれかの方法でセットアップしてください:`n"
        Write-Host "方法1: GitHubからZIPファイルをダウンロード"
        Write-Host "  https://github.com/okazakiyoshio0823/ORBUYOS"
        Write-Host "  「Code」→「Download ZIP」→ 展開してこのファイルを実行`n"
        Write-Host "方法2: Git for Windowsをインストール"
        Write-Host "  https://git-scm.com/download/win`n"
        pause
        exit 1
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
    } catch {
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
