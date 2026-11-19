"""
Project & Backlog URLs — Phase 4
"""

from django.urls import include, path
from apps.projects.api import views

app_name = 'projects'

urlpatterns = [
    # Projects collection & detail
    path('', views.ProjectListCreateView.as_view(), name='project-list-create'),
    path('<slug:project_slug>/', views.ProjectDetailView.as_view(), name='project-detail'),
    path('<slug:project_slug>/archive/', views.ProjectArchiveView.as_view(), name='project-archive'),
    path('<slug:project_slug>/unarchive/', views.ProjectUnarchiveView.as_view(), name='project-unarchive'),

    # Private project memberships
    path('<slug:project_slug>/members/', views.ProjectMemberListCreateView.as_view(), name='project-members'),
    path('<slug:project_slug>/members/<uuid:user_id>/', views.ProjectMemberDetailView.as_view(), name='project-member-detail'),

    # Product Backlog & Work Items
    path('<slug:project_slug>/backlog/', views.BacklogItemListCreateView.as_view(), name='backlog-list-create'),
    path('<slug:project_slug>/work-items/<int:item_number>/', views.WorkItemDetailView.as_view(), name='workitem-detail'),
    path('<slug:project_slug>/work-items/<int:item_number>/reorder/', views.WorkItemReorderView.as_view(), name='workitem-reorder'),
    path('<slug:project_slug>/work-items/<int:item_number>/status/', views.WorkItemStatusTransitionView.as_view(), name='workitem-status'),

    # Sprints & Interactive Kanban Board (Phase 5)
    path('<slug:project_slug>/sprints/', views.SprintListCreateView.as_view(), name='sprint-list-create'),
    path('<slug:project_slug>/sprints/<uuid:sprint_id>/', views.SprintDetailView.as_view(), name='sprint-detail'),
    path('<slug:project_slug>/sprints/<uuid:sprint_id>/start/', views.SprintStartView.as_view(), name='sprint-start'),
    path('<slug:project_slug>/sprints/<uuid:sprint_id>/complete/', views.SprintCompleteView.as_view(), name='sprint-complete'),
    path('<slug:project_slug>/sprints/<uuid:sprint_id>/cancel/', views.SprintCancelView.as_view(), name='sprint-cancel'),
    path('<slug:project_slug>/sprints/<uuid:sprint_id>/add-items/', views.SprintAddItemsView.as_view(), name='sprint-add-items'),
    path('<slug:project_slug>/sprints/<uuid:sprint_id>/remove-items/', views.SprintRemoveItemsView.as_view(), name='sprint-remove-items'),
    path('<slug:project_slug>/board/', views.ActiveSprintBoardView.as_view(), name='active-sprint-board'),

    # Collaboration & Work Item Activity (Phase 6)
    path('<slug:project_slug>/', include('apps.collaboration.api.urls')),
]
