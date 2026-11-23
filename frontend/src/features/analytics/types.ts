export interface BurndownDataPoint {
  date: string;
  day_label: string;
  display_date: string;
  ideal: number;
  actual: number | null;
  remaining_points: number;
  completed_points: number;
  remaining_items: number;
  completed_items: number;
  is_today: boolean;
  is_future: boolean;
}

export interface BurndownSummary {
  sprint_id: string;
  sprint_name: string;
  sprint_goal: string;
  status: string;
  start_date: string;
  end_date: string;
  total_days: number;
  days_remaining: number;
  planned_story_points: number;
  total_story_points: number;
  completed_story_points: number;
  remaining_story_points: number;
  total_items_count: number;
  completed_items_count: number;
  remaining_items_count: number;
  completion_percentage: number;
  pace_status: 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'AT_RISK';
  series: BurndownDataPoint[];
}

export interface ScopeDelta {
  points_added_mid_sprint: number;
  points_removed_mid_sprint: number;
  net_scope_change: number;
  events_count: number;
}

export interface TypeBreakdownItem {
  total: number;
  completed: number;
  points: number;
}

export interface AssigneeBreakdownItem {
  name: string;
  email: string;
  total_items: number;
  completed_items: number;
  total_points: number;
  completed_points: number;
}

export interface SprintReportData {
  summary: BurndownSummary;
  scope_delta: ScopeDelta;
  type_breakdown: Record<string, TypeBreakdownItem>;
  assignee_breakdown: AssigneeBreakdownItem[];
}

export interface VelocitySprintItem {
  sprint_id: string;
  sprint_name: string;
  planned_points: number;
  completed_points: number;
  completion_rate: number;
  completed_at: string | null;
}

export interface ProjectVelocityData {
  project_id: string;
  project_name: string;
  project_key: string;
  average_velocity: number;
  total_completed_points: number;
  sprints_analyzed_count: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  sprints: VelocitySprintItem[];
}

export interface AssignedTaskItem {
  id: string;
  item_number: number;
  key_identifier: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  story_points: number | null;
  due_date: string | null;
  is_overdue: boolean;
  project_slug: string;
  project_name: string;
}

export interface ActiveSprintSummaryItem {
  id: string;
  name: string;
  project_name: string;
  project_slug: string;
  planned_points: number;
  completed_points: number;
  completion_percentage: number;
  total_items: number;
  done_items: number;
  days_remaining: number;
  end_date: string;
}

export interface RecentActivityItem {
  id: string;
  actor_name: string;
  event_type: string;
  object_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface WorkspaceDashboardSummary {
  workspace_slug: string;
  workspace_name: string;
  assigned_to_me_count: number;
  assigned_to_me_items: AssignedTaskItem[];
  overdue_count: number;
  blocked_count: number;
  active_sprints: ActiveSprintSummaryItem[];
  accessible_projects_count: number;
  recent_activity: RecentActivityItem[];
}

export interface SearchResultItem {
  id: string;
  type: 'work_item' | 'sprint' | 'project';
  title?: string;
  name?: string;
  key_identifier?: string;
  item_number?: number;
  item_type?: string;
  status?: string;
  priority?: string;
  story_points?: number | null;
  project_slug?: string;
  project_name?: string;
  assignee_name?: string | null;
  sprint_name?: string | null;
  sprint_goal?: string;
  planned_points?: number;
  key?: string;
  slug?: string;
  visibility?: string;
  description?: string;
  target_url: string;
}

export interface GlobalSearchResponse {
  query: string;
  total_results: number;
  work_items: SearchResultItem[];
  sprints: SearchResultItem[];
  projects: SearchResultItem[];
}
