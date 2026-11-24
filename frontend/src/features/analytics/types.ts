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

export interface PriorityBreakdownItem {
  total: number;
  completed: number;
  points: number;
  completed_points: number;
}

export interface StatusBreakdownItem {
  count: number;
  points: number;
}

export interface PointsBreakdown {
  done_points: number;
  active_points: number;
  todo_points: number;
  total_committed_points: number;
}

export interface BugsSummary {
  total: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface MemberTaskItem {
  id: string;
  item_number: number;
  key_identifier: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  story_points: number | null;
}

export interface AssigneeBreakdownItem {
  name: string;
  email: string;
  initials: string;
  total_items: number;
  completed_items: number;
  active_items: number;
  todo_items: number;
  total_points: number;
  completed_points: number;
  active_points: number;
  todo_points: number;
  percentage_of_sprint_points: number;
  tasks: MemberTaskItem[];
}

export interface SprintReportData {
  summary: BurndownSummary;
  scope_delta: ScopeDelta;
  type_breakdown: Record<string, TypeBreakdownItem>;
  priority_breakdown: Record<string, PriorityBreakdownItem>;
  status_breakdown: Record<string, StatusBreakdownItem>;
  points_breakdown: PointsBreakdown;
  bugs_summary: BugsSummary;
  blocked_count: number;
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

export interface SprintHistoryCardItem {
  sprint_id: string;
  sprint_name: string;
  status: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  planned_points: number;
  delivered_points: number;
  delivery_rate: number;
  carryover_count: number;
  note: string;
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
  sprint_history_cards?: SprintHistoryCardItem[];
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
