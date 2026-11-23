import { apiClient } from '../../lib/api';
import type {
  BurndownSummary,
  SprintReportData,
  ProjectVelocityData,
  WorkspaceDashboardSummary,
  GlobalSearchResponse,
} from './types';

export const analyticsApi = {
  getSprintBurndown: async (
    workspaceSlug: string,
    projectSlug: string,
    sprintId: string
  ): Promise<BurndownSummary> => {
    const response = await apiClient.get<BurndownSummary>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/burndown/`
    );
    return response.data;
  },

  getSprintReport: async (
    workspaceSlug: string,
    projectSlug: string,
    sprintId: string
  ): Promise<SprintReportData> => {
    const response = await apiClient.get<SprintReportData>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/report/`
    );
    return response.data;
  },

  getProjectVelocity: async (
    workspaceSlug: string,
    projectSlug: string,
    limit: number = 10
  ): Promise<ProjectVelocityData> => {
    const response = await apiClient.get<ProjectVelocityData>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/velocity/?limit=${limit}`
    );
    return response.data;
  },

  getWorkspaceDashboardSummary: async (
    workspaceSlug: string
  ): Promise<WorkspaceDashboardSummary> => {
    const response = await apiClient.get<WorkspaceDashboardSummary>(
      `/workspaces/${workspaceSlug}/dashboard-summary/`
    );
    return response.data;
  },

  globalSearch: async (
    workspaceSlug: string,
    query: string,
    type: string = 'all'
  ): Promise<GlobalSearchResponse> => {
    const response = await apiClient.get<GlobalSearchResponse>(
      `/workspaces/${workspaceSlug}/search/?q=${encodeURIComponent(query)}&type=${type}`
    );
    return response.data;
  },
};
