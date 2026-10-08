import { ReminderStatus } from './enums';

export interface Reminder {
  id: string;
  vehicle_id: string;
  title: string;
  description: string | null;
  reminder_date: string | null;
  reminder_km: number | null;
  status: ReminderStatus;
  created_at: string;
}

export interface ReminderPayload {
  vehicle_id: string;
  title: string;
  description: string | null;
  reminder_date: string | null;
  reminder_km: number | null;
  status: ReminderStatus;
}
