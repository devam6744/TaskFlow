"""
Project & Backlog URLs — Phase 4
"""

from django.urls import path
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
]
