export interface CountdownEvent {
  id: number;
  event_name: string;
  description: string;
  event_image?: string;
  event_date: string;
  location: string;
  created_at: string;
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalDays: number;
    isOverdue: boolean;
  };
  priority: 'critical' | 'urgent' | 'normal' | 'future';
  displayDuration: number; // in seconds for auto-rotation
}
