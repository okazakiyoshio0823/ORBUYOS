'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { Modal, VehicleForm, WorkAssignmentForm } from '../components/Modal';
import { VoiceInput, VoiceCommand } from '../components/VoiceInput';
import { ImportData } from '../components/ImportData';
import { Toaster, toast } from 'react-hot-toast';

// 業種タイプ
type Industry = 'demolition' | 'auto_repair';
type ModalType = null | 'vehicle' | 'assignment' | 'workDetail' | 'voice' | 'import';

// スケジュールの型（APIから取得）
interface Schedule {
  id: number;
  work_date: string;
  worker_id: number;
  worker_name: string;
  title: string | null;
  planned_start: string | null;
  planned_minutes: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
  part_name: string | null;
  service_name: string | null;
  service_color: string | null;
  plate_number: string | null;
  maker: string | null;
  model: string | null;
  model_code: string | null;
  notes: string | null;
}

// 作業者の型
interface Worker {
  id: number;
  name: string;
  role: string;
  industry: string;
}

// 表示用タスクの型
interface DisplayTask {
  id: number;
  workerId: number;
  title: string;
  subtitle: string;
  start: number;
  duration: number;
  color: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
}

// 時間帯（8:00-18:00）
const timeSlots = Array.from({ length: 11 }, (_, i) => i + 8);

// ステータスの日本語と色
const statusConfig = {
  pending: { label: '未着手', color: '#9e9e9e', bgColor: '#f5f5f5' },
  in_progress: { label: '作業中', color: '#2196F3', bgColor: '#e3f2fd' },
  completed: { label: '完了', color: '#4CAF50', bgColor: '#e8f5e9' },
  paused: { label: '中断', color: '#FF9800', bgColor: '#fff3e0' },
};

// デフォルト色
const defaultColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#FFC107'];

export default function Home() {
  const [industry, setIndustry] = useState<Industry>('demolition');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedTask, setSelectedTask] = useState<DisplayTask | null>(null);

  // APIから取得するデータ
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // 認証状態
  const [currentUser, setCurrentUser] = useState<Worker | null>(null);
  const router = useRouter();

  // フローティング音声パネル用のステート
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 日付フォーマット
  const formatDate = (date: Date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}(${days[date.getDay()]})`;
  };

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // データベース初期化
  const initializeDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/init', { method: 'POST' });
      const data = await res.json();
      console.log('Database initialization:', data);
      setIsInitialized(true);
      return data.initialized;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  }, []);

  // 作業者データ取得
  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers?industry=${industry}`);
      const data = await res.json();
      if (data.success) {
        setWorkers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    }
  }, [industry]);

  // スケジュールデータ取得
  const fetchSchedules = useCallback(async () => {
    try {
      const dateStr = formatDateForAPI(currentDate);
      const res = await fetch(`/api/schedules?date=${dateStr}&industry=${industry}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  }, [currentDate, industry]);

  // 初回ロード
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // 認証チェック
      try {
        const authRes = await fetch('/api/auth/login');
        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.push('/login');
          return;
        }
        setCurrentUser(authData.data);
        // ログインユーザーの業種をデフォルトに
        if (authData.data?.industry) {
          setIndustry(authData.data.industry);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
        return;
      }

      if (!isInitialized) {
        await initializeDatabase();
      }
      await Promise.all([fetchWorkers(), fetchSchedules()]);
      setIsLoading(false);
    };
    init();
  }, [initializeDatabase, fetchWorkers, fetchSchedules, isInitialized, router]);

  // 業種変更時
  useEffect(() => {
    fetchWorkers();
    fetchSchedules();
  }, [industry, currentDate, fetchWorkers, fetchSchedules]);

  // 定期的なデータ更新と完了通知
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!industry || !currentDate) return;

      try {
        const dateStr = formatDateForAPI(currentDate);
        const res = await fetch(`/api/schedules?date=${dateStr}&industry=${industry}`);
        const data = await res.json();

        if (data.success && data.data) {
          const newSchedules = data.data as Schedule[];

          // 前回のデータと比較して完了数が増えていたら通知
          setSchedules(prev => {
            const prevCompleted = prev.filter(s => s.status === 'completed').length;
            const newCompleted = newSchedules.filter(s => s.status === 'completed').length;

            if (newCompleted > prevCompleted) {
              // 新しく完了したタスクを特定
              const completedTask = newSchedules.find(n =>
                n.status === 'completed' &&
                prev.find(p => p.id === n.id && p.status !== 'completed')
              );

              if (completedTask) {
                const workerName = completedTask.worker_name;
                const taskName = completedTask.title || '作業';

                toast.success(
                  <div>
                    <strong>作業完了報告</strong>
                    <div style={{ fontSize: '0.9em' }}>{workerName}さんが「{taskName}」を完了しました</div>
                  </div>,
                  { duration: 5000, position: 'top-right' }
                );

                // ビープ音
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => { });
              }
            }
            return newSchedules;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // 10秒ごとにチェック

    return () => clearInterval(interval);
  }, [industry, currentDate]);

  // スケジュールを表示用に変換
  const displayTasks: DisplayTask[] = schedules.map((s, index) => {
    const startTime = s.planned_start ? parseInt(s.planned_start.split(':')[0]) : 9;
    const startMinutes = s.planned_start ? parseInt(s.planned_start.split(':')[1]) : 0;
    const start = startTime + startMinutes / 60;
    const duration = (s.planned_minutes || 60) / 60;

    // 車両情報をタイトルに
    const vehicleName = s.model || s.plate_number || '受託車両';
    const title = vehicleName;

    // 作業内容をサブタイトルに
    const subtitle = s.service_name || s.part_name || s.title || '作業';

    const color = s.service_color || defaultColors[index % defaultColors.length];

    return {
      id: s.id,
      workerId: s.worker_id,
      title,
      subtitle,
      start,
      duration,
      color,
      status: s.status,
    };
  });

  // 日付ナビゲーション
  const navigateDate = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    setCurrentDate(newDate);
  };

  // 統計情報
  const getStats = () => {
    const completed = displayTasks.filter(s => s.status === 'completed').length;
    const total = displayTasks.length;
    if (industry === 'demolition') {
      return { label1: '本日入庫', value1: Math.ceil(total / 3), label2: '部品予定', value2: total, label3: '完了', value3: completed };
    }
    const shaken = displayTasks.filter(t => t.title === '車検').length;
    const tenken = displayTasks.filter(t => t.title.includes('点検')).length;
    return { label1: '本日予約', value1: total, label2: '車検', value2: shaken, label3: '点検', value3: tenken };
  };
  const stats = getStats();

  // タスククリック
  const handleTaskClick = (task: DisplayTask) => {
    setSelectedTask(task);
    setActiveModal('workDetail');
  };

  // 作業ステータス変更（API経由）
  const updateTaskStatus = async (taskId: number, newStatus: 'pending' | 'in_progress' | 'completed' | 'paused') => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
          actualMinutes: newStatus === 'completed' ? selectedTask?.duration ? selectedTask.duration * 60 : undefined : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // ローカルステートも更新
        setSchedules(prev => prev.map(s =>
          s.id === taskId ? { ...s, status: newStatus } : s
        ));
        setActiveModal(null);
        setSelectedTask(null);
      } else {
        alert('ステータス更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('ステータス更新に失敗しました');
    }
  };

  // 車両登録（API経由）
  const handleVehicleSubmit = async (data: unknown) => {
    const formData = data as Record<string, string>;
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: formData.plateNumber,
          maker: formData.maker,
          model: formData.model,
          modelCode: formData.modelCode,
          year: formData.year,
          color: formData.color,
          industry,
          notes: formData.notes,
        }),
      });
      const result = await res.json();

      if (result.success) {
        alert('車両を登録しました！');
        setActiveModal(null);
      } else {
        alert('車両登録に失敗しました');
      }
    } catch (error) {
      console.error('Failed to register vehicle:', error);
      alert('車両登録に失敗しました');
    }
  };

  // 作業割当（API経由）
  const handleAssignmentSubmit = async (data: unknown) => {
    const formData = data as Record<string, string>;
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: formatDateForAPI(currentDate),
          workerId: parseInt(formData.workerId),
          vehicleId: formData.vehicleId ? parseInt(formData.vehicleId) : undefined,
          partId: industry === 'demolition' && formData.partOrServiceId ? parseInt(formData.partOrServiceId) : undefined,
          serviceId: industry === 'auto_repair' && formData.partOrServiceId ? parseInt(formData.partOrServiceId) : undefined,
          plannedStart: formData.plannedStart,
          plannedMinutes: parseInt(formData.plannedMinutes),
          industry,
        }),
      });
      const result = await res.json();

      if (result.success) {
        alert('作業を割当しました！');
        setActiveModal(null);
        // データを再取得
        fetchSchedules();
      } else {
        alert('作業割当に失敗しました');
      }
    } catch (error) {
      console.error('Failed to assign work:', error);
      alert('作業割当に失敗しました');
    }
  };

  // 音声コマンド処理（自然言語対応）
  const handleVoiceCommand = async (command: VoiceCommand) => {
    console.log('Voice command:', command);
    setVoiceTranscript(command.raw);

    const inProgressTask = displayTasks.find(s => s.status === 'in_progress');

    switch (command.type) {
      case 'schedule_create':
        // 自然言語から作業を作成（例：「山田太郎 9時 プリウス エンジン カレンダー入力」）
        if (command.workerName && command.time) {
          const targetWorker = workers.find(w => w.name.includes(command.workerName!));
          if (!targetWorker) {
            toast.error(`作業者「${command.workerName}」が見つかりません`);
            break;
          }
          try {
            const res = await fetch('/api/schedules', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workDate: formatDateForAPI(currentDate),
                workerId: targetWorker.id,
                plannedStart: command.time,
                plannedMinutes: 60,
                title: `${command.vehicleName || ''} ${command.partName || '作業'}`.trim(),
                industry,
              }),
            });
            const result = await res.json();
            if (result.success) {
              toast.success(`${targetWorker.name}の${command.time}に「${command.vehicleName || ''} ${command.partName || '作業'}」を登録しました`);
              fetchSchedules();
            } else {
              toast.error('登録に失敗しました');
            }
          } catch (error) {
            console.error('Voice schedule create error:', error);
            toast.error('登録に失敗しました');
          }
        } else {
          toast.error('作業者名と時間を指定してください（例：山田太郎 9時 プリウス エンジン 登録）');
        }
        break;
      case 'start':
        if (command.time) {
          const hour = parseInt(command.time.split(':')[0]);
          const targetTask = displayTasks.find(s => Math.floor(s.start) === hour && s.status === 'pending');
          if (targetTask) {
            updateTaskStatus(targetTask.id, 'in_progress');
            toast.success(`「${targetTask.title}」を開始しました`);
          } else {
            toast.error(`${hour}時の作業が見つかりません`);
          }
        } else {
          const nextTask = displayTasks.find(s => s.status === 'pending');
          if (nextTask) {
            updateTaskStatus(nextTask.id, 'in_progress');
            toast.success(`「${nextTask.title}」を開始しました`);
          }
        }
        break;
      case 'end':
        if (inProgressTask) {
          updateTaskStatus(inProgressTask.id, 'completed');
          toast.success(`「${inProgressTask.title}」を完了しました`);
        } else {
          toast.error('作業中のタスクがありません');
        }
        break;
      case 'pause':
        if (inProgressTask) {
          updateTaskStatus(inProgressTask.id, 'paused');
          toast(`「${inProgressTask.title}」を中断しました`, { icon: '⏸' });
        } else {
          toast.error('作業中のタスクがありません');
        }
        break;
      case 'memo':
        if (command.memo) {
          toast(`メモを追加: ${command.memo}`, { icon: '📝' });
        }
        break;
      default:
        toast.error(`認識できませんでした: ${command.raw}`);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <Toaster />
        <div className={styles.headerLeft}>
          <h1 className={styles.logo}>ORBIYOS</h1>
          <span className={styles.subtitle}>
            {industry === 'demolition' ? '解体作業管理' : '整備作業管理'}
          </span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.industryBtn} ${industry === 'demolition' ? styles.active : ''}`}
            onClick={() => setIndustry('demolition')}
          >
            🔧 解体業
          </button>
          <button
            className={`${styles.industryBtn} ${industry === 'auto_repair' ? styles.active : ''}`}
            onClick={() => setIndustry('auto_repair')}
          >
            🚗 整備業
          </button>
          <div className={styles.userInfo}>
            <span className={styles.userName}>👤 {currentUser?.name || 'ゲスト'}</span>
            <button
              className={styles.logoutBtn}
              onClick={async () => {
                await fetch('/api/auth/login', { method: 'DELETE' });
                router.push('/login');
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* 日付ナビゲーション & 統計 */}
        <div className={styles.topBar}>
          <div className={styles.dateNav}>
            <button className={styles.navBtn} onClick={() => navigateDate(-1)}>◀</button>
            <span className={styles.dateDisplay}>📅 {formatDate(currentDate)}</span>
            <button className={styles.navBtn} onClick={() => navigateDate(1)}>▶</button>
            <button className={styles.todayBtn} onClick={() => setCurrentDate(new Date())}>今日</button>
          </div>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>🚗</span>
              <span className={styles.statLabel}>{stats.label1}:</span>
              <span className={styles.statValue}>{stats.value1}台</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>⚙️</span>
              <span className={styles.statLabel}>{stats.label2}:</span>
              <span className={styles.statValue}>{stats.value2}点</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>✅</span>
              <span className={styles.statLabel}>{stats.label3}:</span>
              <span className={styles.statValue}>{stats.value3}点</span>
            </div>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div className={styles.calendarContainer}>
          <div className={styles.calendar}>
            {/* 時間ヘッダー */}
            <div className={styles.calendarHeader}>
              <div className={styles.workerHeader}></div>
              {timeSlots.map(hour => (
                <div key={hour} className={styles.timeHeader}>
                  {hour}:00
                </div>
              ))}
            </div>

            {/* 作業者行 */}
            {workers.map(worker => (
              <div key={worker.id} className={styles.calendarRow}>
                <div className={styles.workerCell}>
                  {worker.name}
                </div>
                <div className={styles.taskCells}>
                  {/* タスクブロック */}
                  {displayTasks
                    .filter(s => s.workerId === worker.id)
                    .map(task => {
                      const left = ((task.start - 8) / 10) * 100;
                      const width = (task.duration / 10) * 100;
                      const statusStyle = statusConfig[task.status];
                      return (
                        <div
                          key={task.id}
                          className={`${styles.taskBlock} ${styles[`status_${task.status}`]}`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: task.status === 'completed'
                              ? '#a5d6a7'
                              : task.color,
                            opacity: task.status === 'completed' ? 0.7 : 1,
                          }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className={styles.taskTitle}>{task.title}</div>
                          <div className={styles.taskSubtitle}>{task.subtitle}</div>
                          {task.status !== 'pending' && (
                            <div className={styles.taskStatus}>
                              {statusStyle.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* アクションバー */}
        <div className={styles.actionBar}>
          <button className={styles.actionBtn} onClick={() => setActiveModal('vehicle')}>
            <span>🚗</span>
            <span>{industry === 'demolition' ? '車両登録' : '予約登録'}</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setActiveModal('assignment')}>
            <span>📋</span>
            <span>{industry === 'demolition' ? '部品割当' : '入庫受付'}</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setShowVoicePanel(true)}>
            <span>🎤</span>
            <span>音声入力</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setActiveModal('import')}>
            <span>📥</span>
            <span>CSVインポート</span>
          </button>
          <button className={styles.actionBtn} onClick={() => {
            const dateStr = formatDateForAPI(currentDate);
            window.location.href = `/api/export/daily?date=${dateStr}&industry=${industry}`;
          }}>
            <span>📤</span>
            <span>日報出力</span>
          </button>
        </div>
      </main>

      {/* 車両登録モーダル */}
      <Modal
        isOpen={activeModal === 'vehicle'}
        onClose={() => setActiveModal(null)}
        title={industry === 'demolition' ? '🚗 車両登録' : '🚗 予約登録'}
      >
        <VehicleForm
          industry={industry}
          onSubmit={handleVehicleSubmit}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* 作業割当モーダル */}
      <Modal
        isOpen={activeModal === 'assignment'}
        onClose={() => setActiveModal(null)}
        title={industry === 'demolition' ? '📋 部品割当' : '📋 入庫受付'}
      >
        <WorkAssignmentForm
          industry={industry}
          onSubmit={handleAssignmentSubmit}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* CSVインポートモーダル */}
      <Modal
        isOpen={activeModal === 'import'}
        onClose={() => setActiveModal(null)}
        title="📥 CSVインポート"
      >
        <ImportData
          industry={industry}
          onClose={() => setActiveModal(null)}
          onSuccess={() => fetchSchedules()}
        />
      </Modal>

      {/* 音声入力モーダル */}
      <Modal
        isOpen={activeModal === 'voice'}
        onClose={() => setActiveModal(null)}
        title="🎤 音声入力"
      >
        <VoiceInput industry={industry} onCommand={handleVoiceCommand} />
      </Modal>

      {/* 作業詳細モーダル */}
      <Modal
        isOpen={activeModal === 'workDetail' && selectedTask !== null}
        onClose={() => { setActiveModal(null); setSelectedTask(null); }}
        title="📋 作業詳細"
      >
        {selectedTask && (
          <div className={styles.workDetail}>
            <div className={styles.detailHeader}>
              <h3>{selectedTask.title}</h3>
              <span
                className={styles.statusBadge}
                style={{
                  backgroundColor: statusConfig[selectedTask.status].bgColor,
                  color: statusConfig[selectedTask.status].color,
                }}
              >
                {statusConfig[selectedTask.status].label}
              </span>
            </div>
            <div className={styles.detailInfo}>
              <p><strong>{industry === 'demolition' ? '部品:' : '作業:'}</strong> {selectedTask.subtitle}</p>
              <p><strong>開始時間:</strong> {Math.floor(selectedTask.start)}:{String(Math.round((selectedTask.start % 1) * 60)).padStart(2, '0')}</p>
              <p><strong>作業時間:</strong> {Math.round(selectedTask.duration * 60)}分</p>
            </div>
            <div className={styles.detailActions}>
              {selectedTask.status === 'pending' && (
                <button
                  className={styles.startBtn}
                  onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')}
                >
                  ▶ 作業開始
                </button>
              )}
              {selectedTask.status === 'in_progress' && (
                <>
                  <button
                    className={styles.pauseBtn}
                    onClick={() => updateTaskStatus(selectedTask.id, 'paused')}
                  >
                    ⏸ 中断
                  </button>
                  <button
                    className={styles.completeBtn}
                    onClick={() => updateTaskStatus(selectedTask.id, 'completed')}
                  >
                    ✅ 完了
                  </button>
                </>
              )}
              {selectedTask.status === 'paused' && (
                <button
                  className={styles.startBtn}
                  onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')}
                >
                  ▶ 再開
                </button>
              )}
              {selectedTask.status === 'completed' && (
                <>
                  <p className={styles.completedText}>この作業は完了しています</p>
                  <button
                    className={styles.revertBtn}
                    onClick={() => updateTaskStatus(selectedTask.id, 'pending')}
                  >
                    ↩ 未着手に戻す
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* フローティング音声入力パネル */}
      {showVoicePanel && (
        <div className={styles.floatingVoicePanel}>
          <div className={styles.voicePanelLeft}>
            <button
              className={`${styles.voiceMicBtn} ${isListening ? styles.listening : ''} ${isProcessing ? styles.processing : ''}`}
              onClick={() => {
                if (!isListening) {
                  // 音声認識開始
                  if (typeof window !== 'undefined') {
                    const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
                    if (SpeechRecognition) {
                      const recognition = new SpeechRecognition();
                      recognition.continuous = false;
                      recognition.interimResults = true;
                      recognition.lang = 'ja-JP';
                      recognition.onstart = () => setIsListening(true);
                      recognition.onresult = (event: SpeechRecognitionEvent) => {
                        let finalTranscript = '';
                        let interimTranscript = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                          const result = event.results[i];
                          if (result.isFinal) finalTranscript += result[0].transcript;
                          else interimTranscript += result[0].transcript;
                        }
                        setVoiceTranscript(interimTranscript || finalTranscript);
                        if (finalTranscript) {
                          // VoiceInputのparseCommandと同じロジックを使用
                          const normalized = finalTranscript.toLowerCase().replace(/\s+/g, '');
                          const timePattern = /(\d{1,2})時(半)?/;
                          const timeMatch = finalTranscript.match(timePattern);
                          const time = timeMatch
                            ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] ? '30' : '00'}`
                            : undefined;

                          if (normalized.includes('登録') || normalized.includes('カレンダー入力') ||
                            normalized.includes('追加') || normalized.includes('予定入力')) {
                            const namePattern = /([一-龯]{1,3})\s*([一-龯]{1,3})/;
                            const nameMatch = finalTranscript.match(namePattern);
                            const workerName = nameMatch ? `${nameMatch[1]} ${nameMatch[2]}`.trim() : undefined;
                            const carNames = ['プリウス', 'アクア', 'ヤリス', 'カローラ', 'クラウン', 'ノア', 'ヴォクシー', 'アルファード', 'フィット'];
                            const vehicleName = carNames.find(car => finalTranscript.includes(car));
                            const partNames = ['エンジン', 'ミッション', 'ドア', 'バンパー', '車検', '点検', '整備'];
                            const partName = partNames.find(part => finalTranscript.includes(part));
                            handleVoiceCommand({ type: 'schedule_create', time, workerName, vehicleName, partName, raw: finalTranscript });
                          } else if (normalized.includes('開始') || normalized.includes('スタート')) {
                            handleVoiceCommand({ type: 'start', time, raw: finalTranscript });
                          } else if (normalized.includes('終了') || normalized.includes('完了')) {
                            handleVoiceCommand({ type: 'end', time, raw: finalTranscript });
                          } else if (normalized.includes('中断') || normalized.includes('ストップ')) {
                            handleVoiceCommand({ type: 'pause', time, raw: finalTranscript });
                          } else {
                            handleVoiceCommand({ type: 'unknown', raw: finalTranscript });
                          }
                        }
                      };
                      recognition.onend = () => setIsListening(false);
                      recognition.start();
                    }
                  }
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? '⏳' : (isListening ? '🟥' : '🎤')}
            </button>
            <div className={styles.voiceStatusText}>
              <span className={styles.voiceStatusMain}>
                {isProcessing ? '解析中...' : (isListening ? '聞いています...' : 'タップして話す')}
              </span>
              <span className={styles.voiceStatusSub}>
                {useAI ? 'AIモード' : '通常モード'}
              </span>
            </div>
          </div>

          <div className={styles.voicePanelCenter}>
            <div className={`${styles.voiceTranscript} ${!voiceTranscript ? styles.empty : ''}`}>
              {voiceTranscript || '音声認識結果がここに表示されます'}
            </div>
            <div className={styles.voiceHints}>
              <span className={styles.voiceHint}>「山田太郎 9時 プリウス エンジン 登録」</span>
              <span className={styles.voiceHint}>「9時 開始」</span>
              <span className={styles.voiceHint}>「完了」</span>
            </div>
          </div>

          <div className={styles.voicePanelRight}>
            <div className={styles.voiceModeToggle}>
              <label>
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                />
                AI
              </label>
            </div>
            <button
              className={styles.voiceCloseBtn}
              onClick={() => {
                setShowVoicePanel(false);
                setVoiceTranscript('');
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
