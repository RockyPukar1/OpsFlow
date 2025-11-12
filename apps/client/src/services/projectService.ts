import type { ApiResponse, CreateProjectData, Project } from '@opsflow/types';

import { api, apiRequest } from '@/lib/axios';

export const projectService = {
  async getProjects(page = 1, limit = 20): Promise<ApiResponse<Project[]>> {
    return apiRequest(api.get(`/projects?page=${page}&limit=${limit}`));
  },
  async getProject(id: string): Promise<ApiResponse<Project>> {
    return apiRequest(api.get(`/projects/${id}`));
  },
  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    return apiRequest(api.post('/projects', data));
  },
  async updateProject(id: string, data: Partial<CreateProjectData>): Promise<ApiResponse<Project>> {
    return apiRequest(api.patch(`/projects/${id}`, data));
  },
  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return apiRequest(api.delete(`/projects/${id}`));
  },
  async addMember(projectId: string, userId: string): Promise<ApiResponse<Project>> {
    return apiRequest(api.post(`/projects/${projectId}/members`, { userId }));
  },
  async removeMember(projectId: string, userId: string): Promise<ApiResponse<Project>> {
    return apiRequest(api.delete(`/projects/${projectId}/members/${userId}`));
  },
};
