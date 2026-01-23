// 型定義

export interface Worker {
    id: number;
    name: string;
    role: 'admin' | 'manager' | 'worker';
    industry: 'demolition' | 'auto_repair';
    created_at: string;
}

export interface Customer {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    industry: 'demolition' | 'auto_repair';
    created_at: string;
}

export interface Vehicle {
    id: number;
    customer_id?: number;
    plate_number?: string;
    maker?: string;
    model?: string;
    model_code?: string;
    year?: number;
    color?: string;
    vin?: string;
    received_date?: string;
    status: 'pending' | 'in_progress' | 'completed';
    industry: 'demolition' | 'auto_repair';
    notes?: string;
    created_at: string;
}

export interface Part {
    id: number;
    name: string;
    category?: string;
    default_minutes: number;
    created_at: string;
}

export interface ServiceMenu {
    id: number;
    name: string;
    category?: string;
    default_minutes: number;
    color: string;
    created_at: string;
}

export interface WorkSchedule {
    id: number;
    work_date: string;
    worker_id: number;
    vehicle_id?: number;
    customer_id?: number;
    part_id?: number;
    service_id?: number;
    title?: string;
    planned_start?: string;
    planned_end?: string;
    planned_minutes?: number;
    actual_start?: string;
    actual_end?: string;
    actual_minutes?: number;
    status: 'pending' | 'in_progress' | 'completed' | 'paused';
    notes?: string;
    industry: 'demolition' | 'auto_repair';
    created_at: string;

    // Joined fields
    worker_name?: string;
    plate_number?: string;
    maker?: string;
    model?: string;
    model_code?: string;
    customer_name?: string;
    part_name?: string;
    service_name?: string;
    service_color?: string;
}

export interface CalendarTask {
    id: number;
    workerId: number;
    workerName: string;
    title: string;
    subtitle: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    status: WorkSchedule['status'];
    color: string;
    vehicleInfo?: string;
}

export interface DailyStats {
    totalVehicles: number;
    totalParts: number;
    completedParts: number;
    totalServices: number;
    completedServices: number;
}
