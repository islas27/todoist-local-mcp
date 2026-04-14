export interface TodoistDue {
  date: string;
  string: string;
  time?: string;         // "14:00" — HH:MM, only present if time is set
  is_recurring: boolean;
  timezone?: string;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  due?: TodoistDue;
  is_completed: boolean;
  created_at: string;
  url: string;
}

export interface GetTasksParams {
  project_id?: string;
  label?: string;
  filter?: string;
}

export interface CreateTaskParams {
  content: string;
  project_id?: string;
  description?: string;
  due_string?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}

export interface UpdateTaskParams {
  content?: string;
  description?: string;
  due_string?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}
