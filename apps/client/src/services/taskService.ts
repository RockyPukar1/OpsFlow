import type { ApiResponse, Task, CreateTaskData, TaskFilters } from '@opsflow/types';

import { api, apiRequest } from '@/lib/axios';

export const taskService = {
  async getTasks(filters: TaskFilters = {}): Promise<ApiResponse<Task[]>> {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters.projectId) params.append('projectId', filters.projectId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    return apiRequest(api.get(`/tasks?${params.toString()}`));
  },
  async getTask(id: string): Promise<ApiResponse<Task>> {
    return apiRequest(api.get(`/tasks/${id}`));
  },
  async createTask(data: CreateTaskData): Promise<ApiResponse<Task>> {
    return apiRequest(api.post('/tasks', data));
  },
  async updateTask(id: string, data: Partial<CreateTaskData>): Promise<ApiResponse<Task>> {
    return apiRequest(api.patch(`/tasks/${id}`, data));
  },
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return apiRequest(api.delete(`/tasks/${id}`));
  },
  // Convenience methods for common operations
  async updateTaskStatus(id: string, status: Task['status']): Promise<ApiResponse<Task>> {
    return apiRequest(api.patch(`/tasks/${id}`, { status }));
  },
  async updateTaskPriority(id: string, priority: Task['priority']): Promise<ApiResponse<Task>> {
    return apiRequest(api.patch(`/tasks/${id}`, priority));
  },
};
