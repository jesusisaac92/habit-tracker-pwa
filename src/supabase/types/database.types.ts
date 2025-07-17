export interface Profile {
  id: string;
  name: string;
  last_name: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export type Habit = {
  id: string
  user_id: string
  title: string
  description: string
  created_at: string
  // ... otros campos que ya tengas en tu app
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed: boolean;
  time: string | null;
  color: string | null;
  is_recurring: boolean;
  label_id: string | null;
  created_at: string;
  updated_at: string;
  recurring_dates: string[] | null;
  recurring_exceptions: Record<string, { time?: string }> | null;
  custom_label_name: string | null;
  custom_label_color: string | null;
  time_exceptions: Record<string, { time: string }> | null;
}

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          note: string | null;
          priority: 'low' | 'medium' | 'high';
          due_date: string | null;
          completed: boolean;
          time: string | null;
          color: string | null;
          is_recurring: boolean;
          label_id: string | null;
          created_at: string;
          updated_at: string;
          recurring_exceptions: Record<string, { time?: string }> | null;
          recurring_dates: string[] | null;
          custom_label_name: string | null;
          custom_label_color: string | null;
          time_exceptions: Record<string, { time: string }> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          note?: string | null;
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          completed?: boolean;
          time?: string | null;
          color?: string | null;
          is_recurring?: boolean;
          label_id?: string | null;
          created_at?: string;
          updated_at?: string;
          recurring_exceptions?: Record<string, { time?: string }> | null;
          recurring_dates?: string[] | null;
          custom_label_name?: string | null;
          custom_label_color?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          note?: string | null;
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          completed?: boolean;
          time?: string | null;
          color?: string | null;
          is_recurring?: boolean;
          label_id?: string | null;
          created_at?: string;
          updated_at?: string;
          recurring_exceptions?: Record<string, { time?: string }> | null;
          recurring_dates?: string[] | null;
          custom_label_name?: string | null;
          custom_label_color?: string | null;
        };
      }
    }
  }
} 