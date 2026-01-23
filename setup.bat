@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   ORBIYOS ワンクリックセットアップ
echo ========================================
echo.

REM Check if we're already in the orbiyos directory
if exist "package.json" (
    echo ✓ プロジェクトフォルダを検出しました
    goto :install
)

REM Check if git is installed
where git >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Gitが検出されました
    echo.
    echo プロジェクトをクローンしています...
    git clone https://github.com/okazakiyoshio0823/ORBUYOS.git orbiyos
    if %errorlevel% neq 0 (
        echo ✗ クローンに失敗しました
        goto :error
    )
    cd orbiyos
) else (
    echo ⚠ Gitが見つかりません
    echo.
    echo 以下のいずれかの方法でセットアップしてください:
    echo.
    echo 方法1: GitHubからZIPファイルをダウンロード
    echo   https://github.com/okazakiyoshio0823/ORBUYOS
    echo   「Code」→「Download ZIP」→ 展開してこのファイルを実行
    echo.
    echo 方法2: Git for Windowsをインストール
    echo   https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

:install
echo.
echo ========================================
echo   依存関係をインストール中...
echo ========================================
echo.

REM Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ npmが見つかりません
    echo.
    echo Node.jsをインストールしてください:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Set execution policy for npm
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" >nul 2>&1

echo npm install を実行中...
call npm install
if %errorlevel% neq 0 (
    echo ✗ インストールに失敗しました
    goto :error
)

echo.
echo ✓ インストール完了！
echo.

:start
echo ========================================
echo   開発サーバーを起動中...
echo ========================================
echo.

echo 起動中... (数秒お待ちください)
timeout /t 3 /nobreak >nul

REM Start dev server
start /b cmd /c "npm run dev > .server.log 2>&1"

REM Wait for server to start
echo サーバーの起動を待っています...
:wait_loop
timeout /t 2 /nobreak >nul

REM Check if server is running
powershell -Command "$response = try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 1 -UseBasicParsing } catch {}; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :server_ready

REM Check log for errors
if exist .server.log (
    findstr /i "error" .server.log >nul
    if %errorlevel% equ 0 (
        echo ✗ サーバー起動エラー:
        type .server.log
        goto :error
    )
)

REM Try again (max 15 times = 30 seconds)
set /a attempts+=1
if !attempts! lss 15 goto :wait_loop

echo ⚠ サーバーの起動に時間がかかっています...
echo 手動で確認してください: http://localhost:3000
goto :open_browser

:server_ready
echo ✓ サーバーが起動しました！
echo.

:open_browser
echo ========================================
echo   ブラウザを起動中...
echo ========================================
echo.

REM Open browser
start http://localhost:3000

echo.
echo ========================================
echo   セットアップ完了！
echo ========================================
echo.
echo ✓ ORBIYOSが起動しました
echo ✓ ブラウザが自動で開きます
echo.
echo URL: http://localhost:3000
echo.
echo サーバーを停止するには、このウィンドウを閉じてください
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo   エラーが発生しました
echo ========================================
echo.
echo セットアップを完了できませんでした。
echo 手動で以下のコマンドを実行してください:
echo.
echo   1. cd ORBUYOS
echo   2. npm install
echo   3. npm run dev
echo.
pause
exit /b 1
