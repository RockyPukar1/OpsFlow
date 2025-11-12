// Common types shared between client and server
export interface User {
  _id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "member";
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthToken;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  owner: User;
  members: User[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}
export interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  assignee: User;
  project: Project;
  dueDate: Date;
  tags: string[];
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

// Form Data Types
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status: Task["status"];
  priority: Task["priority"];
  assigneeId?: string;
  projectId: string;
  dueDate?: string;
  tags?: string[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

// WebSocket Types
export interface NotificationData {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ActivityData {
  userId: string;
  activity: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// API Error Types
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}
