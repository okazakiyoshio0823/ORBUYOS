@echo off
chcp 65001 >nul
title ORBIYOS起動

echo.
echo ========================================
echo   ORBIYOS起動スクリプト
echo ========================================
echo.

REM 既にサーバーが起動しているかチェック
netstat -ano | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚡ ORBIYOSは既に起動しています！
    echo ブラウザを開きます...
    echo.
    start http://localhost:3000
    timeout /t 3 >nul
    exit
)

REM カレントディレクトリをバッチファイルの場所に変更
cd /d "%~dp0"

echo 開発サーバーを起動中...
echo.

REM npm run devを実行してブラウザを開く
start /B npm run dev

echo サーバーの起動を待っています...
timeout /t 8 /nobreak >nul

echo.
echo ブラウザを開きます...
start http://localhost:3000

echo.
echo ========================================
echo   起動完了！
echo ========================================
echo.
echo ✓ ORBIYOSが起動しました
echo ✓ ブラウザが自動で開きます
echo.
echo URL: http://localhost:3000
echo.
echo このウィンドウは閉じても大丈夫です。
echo サーバーはバックグラウンドで動作し続けます。
echo.
echo サーバーを完全に停止したい場合は、
echo タスクマネージャーでNode.jsプロセスを終了してください。
echo.
pause
