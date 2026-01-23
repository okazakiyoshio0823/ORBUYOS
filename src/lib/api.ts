// API Client - フロントエンドからAPIを呼び出すためのクライアント

const API_BASE = '/api';

// 共通のfetch関数
async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: 'Network error' };
    }
}

// 作業者API
export const workersApi = {
    getAll: (industry?: string) => {
        const params = industry ? `?industry=${industry}` : '';
        return apiFetch<Worker[]>(`/workers${params}`);
    },
    create: (data: { name: string; role?: string; industry: string }) =>
        apiFetch<Worker>('/workers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// 車両API
export const vehiclesApi = {
    getAll: (industry?: string, status?: string) => {
        const params = new URLSearchParams();
        if (industry) params.append('industry', industry);
        if (status) params.append('status', status);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiFetch<Vehicle[]>(`/vehicles${query}`);
    },
    create: (data: VehicleCreateData) =>
        apiFetch<Vehicle>('/vehicles', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: number, data: Partial<VehicleCreateData>) =>
        apiFetch<Vehicle>('/vehicles', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
        }),
    delete: (id: number) =>
        apiFetch<void>(`/vehicles?id=${id}`, { method: 'DELETE' }),
};

// スケジュールAPI
export const schedulesApi = {
    getByDate: (date: string, industry: string) =>
        apiFetch<ScheduleWithDetails[]>(`/schedules?date=${date}&industry=${industry}`),
    create: (data: ScheduleCreateData) =>
        apiFetch<{ id: number }>('/schedules', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updateStatus: (id: number, status: string, actualMinutes?: number) =>
        apiFetch<void>('/schedules', {
            method: 'PUT',
            body: JSON.stringify({
                id,
                status,
                actualMinutes,
                actualStart: status === 'in_progress' ? new Date().toTimeString().slice(0, 5) : undefined,
                actualEnd: status === 'completed' ? new Date().toTimeString().slice(0, 5) : undefined,
            }),
        }),
    delete: (id: number) =>
        apiFetch<void>(`/schedules?id=${id}`, { method: 'DELETE' }),
};

// 型定義
export interface Worker {
    id: number;
    name: string;
    role: string;
    industry: string;
}

export interface Vehicle {
    id: number;
    plate_number: string;
    maker: string;
    model: string;
    model_code: string;
    year: number;
    color: string;
    customer_id: number | null;
    industry: string;
    status: string;
    notes: string;
}

export interface VehicleCreateData {
    plateNumber: string;
    maker: string;
    model: string;
    modelCode?: string;
    year?: string;
    color?: string;
    customerId?: number;
    industry: string;
    notes?: string;
}

export interface ScheduleWithDetails {
    id: number;
    work_date: string;
    worker_id: number;
    worker_name: string;
    vehicle_id: number | null;
    plate_number: string | null;
    maker: string | null;
    model: string | null;
    model_code: string | null;
    customer_id: number | null;
    customer_name: string | null;
    part_id: number | null;
    part_name: string | null;
    service_id: number | null;
    service_name: string | null;
    service_color: string | null;
    title: string | null;
    planned_start: string | null;
    planned_end: string | null;
    planned_minutes: number | null;
    actual_start: string | null;
    actual_end: string | null;
    actual_minutes: number | null;
    status: 'pending' | 'in_progress' | 'completed' | 'paused';
    notes: string | null;
    industry: string;
}

export interface ScheduleCreateData {
    workDate: string;
    workerId: number;
    vehicleId?: number;
    customerId?: number;
    partId?: number;
    serviceId?: number;
    title?: string;
    plannedStart?: string;
    plannedMinutes?: number;
    industry: string;
}
