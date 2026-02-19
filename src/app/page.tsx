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

// 時間帯（8:00-18:00 の10時間）
// 時間帯（8:00-18:00 の10時間）
const timeSlots = Array.from({ length: 10 }, (_, i) => i + 8);

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
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null); // TODO: Define strict type
  const [industry, setIndustry] = useState<Industry>('demolition');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedTask, setSelectedTask] = useState<DisplayTask | null>(null);

  // APIから取得するデータ
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]); // TODO: Define strict type
  const [parts, setParts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [initialAssignmentData, setInitialAssignmentData] = useState<{ workerId?: string, plannedStart?: string } | undefined>(undefined);

  // 音声機能用ステート
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [useAI, setUseAI] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // ... (existing code)

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
      const dateStr = currentDate.toISOString().split('T')[0];
      const res = await fetch(`/api/schedules?date=${dateStr}&industry=${industry}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  }, [industry, currentDate]);

  // マスタデータ取得 (部品/作業)
  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch(`/api/master?industry=${industry}`);
      const data = await res.json();
      if (data.success) {
        setParts(data.data.parts || []);
        setServices(data.data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch master data:', error);
    }
  }, [industry]);


  // 車両データ取得
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch(`/api/vehicles?industry=${industry}`);
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  }, [industry]);

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
        if (authData.data?.industry) {
          setIndustry(authData.data.industry);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
        return;
      }

      if (!isInitialized) {
        try {
          await fetch('/api/init', { method: 'POST' });
        } catch (e) {
          console.error('Init failed', e);
        }
        setIsInitialized(true);
      }
      await Promise.all([fetchWorkers(), fetchSchedules(), fetchVehicles(), fetchMasterData()]);
      setIsLoading(false);
    };
    init();
  }, [fetchWorkers, fetchSchedules, fetchVehicles, fetchMasterData, isInitialized, router]);

  // 業種変更時
  useEffect(() => {
    fetchWorkers();
    fetchSchedules();
    fetchVehicles();
    fetchMasterData();
  }, [industry, currentDate, fetchWorkers, fetchSchedules, fetchVehicles, fetchMasterData]);

  // 表示用タスクデータの生成
  const displayTasks: DisplayTask[] = schedules.map(s => {
    const [h, m] = (s.planned_start || '09:00').split(':').map(Number);
    const start = h + m / 60;
    const duration = (s.planned_minutes || 60) / 60;

    return {
      id: s.id,
      workerId: s.worker_id,
      title: s.title || (industry === 'demolition' ? '部品取外' : '整備'),
      subtitle: s.part_name || s.service_name || s.notes || '詳細なし',
      start,
      duration,
      color: s.service_color || '#2196F3',
      status: s.status,
    };
  });

  // 作業者別統計を計算
  const workerStats = workers.map(worker => {
    const workerTasks = displayTasks.filter(t => t.workerId === worker.id);
    const totalCount = workerTasks.length;
    const completedCount = workerTasks.filter(t => t.status === 'completed').length;
    const totalMinutes = workerTasks.reduce((sum, t) => sum + (t.duration * 60), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    return {
      workerId: worker.id,
      totalCount,
      completedCount,
      totalHours,
    };
  });

  // 現在時刻管理
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 60000); // 1分ごとに更新
    return () => clearInterval(timer);
  }, []);

  // 作業割当サブミット
  const handleAssignmentSubmit = async (data: any) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: currentDate.toISOString().split('T')[0],
          workerId: data.workerId,
          vehicleId: data.vehicleId,
          partId: industry === 'demolition' && data.partOrServiceId !== 'manual' ? data.partOrServiceId : null,
          serviceId: industry === 'auto_repair' && data.partOrServiceId !== 'manual' ? data.partOrServiceId : null,
          title: data.partOrServiceId === 'manual' ? data.customTaskTitle : (industry === 'demolition' ? '部品取外' : '整備作業'),
          notes: data.partOrServiceId === 'manual' ? data.customTaskContent : null,
          plannedStart: data.plannedStart,
          plannedMinutes: data.plannedMinutes,
          industry,
        }),
      });

      if (res.ok) {
        toast.success('作業を割り当てました');
        await fetchSchedules();
        setActiveModal(null);
        setInitialAssignmentData(undefined);
      } else {
        toast.error('割当に失敗しました');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('エラーが発生しました');
    }
  };

  // タスククリック
  const handleTaskClick = (task: DisplayTask) => {
    setSelectedTask(task);
    setActiveModal('workDetail');
  };

  // ステータス更新
  const updateTaskStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, actualMinutes: status === 'completed' ? 60 : undefined })
      });
      if (res.ok) {
        toast.success('ステータスを更新しました');
        fetchSchedules();
        if (status === 'completed' || status === 'pending') {
          setActiveModal(null);
          setSelectedTask(null);
        }
      } else {
        toast.error('更新に失敗しました');
      }
    } catch (e) {
      toast.error('通信エラー');
    }
  };

  // タスク削除
  const deleteTask = async (id: number) => {
    if (!confirm('この作業を取り消してもよろしいですか？')) return;

    try {
      const res = await fetch(`/api/schedules?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('作業を取り消しました');
        fetchSchedules();
        setActiveModal(null);
        setSelectedTask(null);
      } else {
        toast.error('取り消しに失敗しました');
      }
    } catch (e) {
      toast.error('通信エラー');
    }
  };

  // 音声コマンドハンドラ
  const handleVoiceCommand = async (cmd: VoiceCommand) => {
    console.log('Voice command:', cmd);
    toast('音声コマンド: ' + cmd.type);
    // 実装簡略化のためログ出力のみ
  };

  // カレンダーセルクリックハンドラ
  const handleCalendarCellClick = (e: React.MouseEvent<HTMLDivElement>, workerId: number) => {
    // タスク要素クリック時は何もしない（伝播防止されているはずだが念のため）
    if ((e.target as HTMLElement).closest(`.${styles.taskBlock}`)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // 8:00 から 18:00 までの10時間
    const ratio = x / width;
    const hours = 8 + ratio * 10;

    // 時間単位で切り捨て（枠内のどこをクリックしてもその時間の00分開始にする）
    const roundedMinutes = Math.floor(hours) * 60;
    const hour = Math.floor(roundedMinutes / 60);
    const minute = 0; // 常に00分

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    setInitialAssignmentData({
      workerId: workerId.toString(),
      plannedStart: timeStr
    });
    setActiveModal('assignment');
  };

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>ORBIYOS</div>
          <div className={styles.subtitle}>汎用業務支援システム</div>
          <nav className={styles.headerNav}>
            <a href="/" className={`${styles.navLink} ${styles.active}`}>📅 カレンダー</a>
            <a href="/reports" className={styles.navLink}>📊 レポート</a>
          </nav>
        </div>

        <div className={styles.headerRight}>
          <button
            className={`${styles.industryBtn} ${industry === 'demolition' ? styles.active : ''}`}
            onClick={() => setIndustry('demolition')}
          >
            🚧 解体業
          </button>
          <button
            className={`${styles.industryBtn} ${industry === 'auto_repair' ? styles.active : ''}`}
            onClick={() => setIndustry('auto_repair')}
          >
            🔧 整備業
          </button>

          <div className={styles.userInfo}>
            <span className={styles.userName}>{currentUser?.name || 'ゲスト'}</span>
            <button className={styles.logoutBtn} onClick={() => router.push('/login')}>ログアウト</button>
          </div>
        </div>
      </header>

      <main className={`${styles.main} ${showVoicePanel ? styles.mainWithVoicePanel : ''}`}>
        {/* トップバー */}
        <div className={styles.topBar}>
          <div className={styles.dateNav}>
            <button className={styles.navBtn} onClick={() => {
              const prev = new Date(currentDate);
              prev.setDate(prev.getDate() - 1);
              setCurrentDate(prev);
            }}>◀</button>
            <span className={styles.dateDisplay}>
              {currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <button className={styles.navBtn} onClick={() => {
              const next = new Date(currentDate);
              next.setDate(next.getDate() + 1);
              setCurrentDate(next);
            }}>▶</button>
            <button className={styles.todayBtn} onClick={() => setCurrentDate(new Date())}>今日</button>
            <div className={styles.currentTimeBar}>
              <span>🕒</span>
              <span>{nowTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>📋</span>
              <div>
                <div className={styles.statLabel}>予定</div>
                <div className={styles.statValue}>{schedules.length}件</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>✅</span>
              <div>
                <div className={styles.statLabel}>完了</div>
                <div className={styles.statValue}>{schedules.filter(s => s.status === 'completed').length}件</div>
              </div>
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
            {workers.map(worker => {
              const stats = workerStats.find(s => s.workerId === worker.id) || { totalCount: 0, completedCount: 0, totalHours: '0.0' };

              return (
                <div key={worker.id} className={styles.calendarRow}>
                  <div className={styles.workerCell}>
                    <div className={styles.workerName}>{worker.name}</div>
                    <div className={styles.workerStats}>
                      <span title="担当件数">📋 {stats.totalCount}</span>
                      <span title="完了件数">✅ {stats.completedCount}</span>
                      <span title="作業時間">⏱ {stats.totalHours}h</span>
                    </div>
                  </div>
                  <div
                    className={styles.taskCells}
                    onClick={(e) => handleCalendarCellClick(e, worker.id)}
                    title="クリックして作業を追加"
                  >
                    {/* グリッド背景レイヤー */}
                    <div className={styles.gridLayer}>
                      {timeSlots.map(h => (
                        <div key={h} className={styles.gridCol}></div>
                      ))}
                    </div>

                    {/* 現在時刻線 */}
                    {(() => {
                      const currentH = nowTime.getHours() + nowTime.getMinutes() / 60;
                      if (currentH >= 8 && currentH <= 18) {
                        const left = ((currentH - 8) / 10) * 100;
                        return <div className={styles.currentTimeLine} style={{ left: `${left}%` }} />;
                      }
                      return null;
                    })()}

                    {/* タスクブロック */}
                    {displayTasks
                      .filter(s => s.workerId === worker.id)
                      .map(task => {
                        const left = ((task.start - 8) / 10) * 100;
                        const width = (task.duration / 10) * 100;
                        const statusStyle = statusConfig[task.status];

                        // 遅延判定: ステータスがpending かつ 現在時刻が開始時間を過ぎている
                        const currentH = nowTime.getHours() + nowTime.getMinutes() / 60;
                        const isToday = nowTime.toDateString() === currentDate.toDateString();
                        // 1分の猶予（秒単位ズレ防止）
                        const isOverdue = isToday && task.status === 'pending' && currentH > task.start + (1 / 60);

                        return (
                          <div
                            key={task.id}
                            className={`${styles.taskBlock} ${styles[`status_${task.status}`]} ${isOverdue ? styles.overdue : ''}`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: task.status === 'completed'
                                ? '#a5d6a7'
                                : task.color,
                              opacity: task.status === 'completed' ? 0.7 : 1,
                            }}
                            onClick={(e) => {
                              e.stopPropagation(); // 親のクリックイベントを停止
                              handleTaskClick(task);
                            }}
                          >
                            <div className={styles.taskTitle}>
                              {isOverdue && '⚠️ '}{task.title}
                            </div>
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
              );
            })}
          </div>
        </div>

        {/* アクションバー */}
        <div className={styles.actionBar}>
          <button className={styles.actionBtn} onClick={() => setActiveModal('voice')}>
            <span>🎤</span>
            <span>音声入力</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setActiveModal('import')}>
            <span>📥</span>
            <span>CSV取込</span>
          </button>
          <button className={styles.actionBtn} onClick={() => {
            // 簡易的に現在の時間をセットしてモーダルを開く
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')}`;
            setInitialAssignmentData({ plannedStart: timeStr });
            setActiveModal('assignment');
          }}>
            <span>➕</span>
            <span>タスク追加</span>
          </button>
        </div>

      </main>

      {/* 車両登録モーダル */}
      <Modal
        isOpen={activeModal === 'vehicle'}
        onClose={() => setActiveModal(null)}
        title="🚗 車両登録"
      >
        <VehicleForm
          industry={industry}
          onSubmit={async (data) => {
            console.log('New Vehicle:', data);
            // 簡易実装: データベースへの保存ロジックは別途必要だが、今回は動線確認のためログ出力とトーストのみ
            try {
              // TODO: /api/vehiclesへのPOST処理を実装する
              // const res = await fetch('/api/vehicles', { method: 'POST', body: JSON.stringify(data) ... });
              toast.success('車両を登録しました (デモ)');
              setActiveModal(null);
              fetchVehicles(); // リスト更新
            } catch (e) {
              toast.error('登録に失敗しました');
            }
          }}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* 作業割当モーダル */}
      <Modal
        isOpen={activeModal === 'assignment'}
        onClose={() => { setActiveModal(null); setInitialAssignmentData(undefined); }} // 閉じる時に初期値をリセット
        title={industry === 'demolition' ? '📋 部品割当' : '📋 入庫受付'}
      >
        <WorkAssignmentForm
          industry={industry}
          onSubmit={handleAssignmentSubmit}
          onCancel={() => { setActiveModal(null); setInitialAssignmentData(undefined); }}
          vehicles={vehicles}
          workers={workers}
          parts={parts}
          services={services}
          initialValues={initialAssignmentData}
          onSwitchToRegister={() => setActiveModal('vehicle')}
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
                  <p className={styles.completedText}>この作業は完了しています                  </p>
                  <button
                    className={styles.revertBtn}
                    onClick={() => updateTaskStatus(selectedTask.id, 'pending')}
                  >
                    ↩ 未着手に戻す
                  </button>
                </>
              )}

              {/* 削除ボタン（未着手・中断中のみ表示など調整可、今回は全ステータスで表示するが、実運用では未着手のみが望ましいかも） */}
              <button
                className={styles.deleteBtn}
                onClick={() => deleteTask(selectedTask.id)}
                style={{ marginTop: '1rem', background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', float: 'right' }}
              >
                🗑️ 作業取消
              </button>
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (SpeechRecognitionAPI) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const recognition = new SpeechRecognitionAPI() as any;
                      recognition.continuous = false;
                      recognition.interimResults = true;
                      recognition.lang = 'ja-JP';
                      recognition.onstart = () => setIsListening(true);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      recognition.onresult = (event: any) => {
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
