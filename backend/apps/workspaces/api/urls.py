"""
Workspace API URLs — Phase 3
"""

from django.urls import path
from apps.workspaces.api import views

app_name = 'workspaces'

urlpatterns = [
    # Top-level workspace collection
    path('', views.WorkspaceListCreateView.as_view(), name='workspace-list-create'),

    # Invitation acceptance (global endpoint - not scoped to single workspace slug)
    path('invites/accept/', views.AcceptInviteView.as_view(), name='invite-accept'),

    # Workspace-scoped operations
    path('<slug:slug>/', views.WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('<slug:slug>/archive/', views.WorkspaceArchiveView.as_view(), name='workspace-archive'),
    path('<slug:slug>/unarchive/', views.WorkspaceUnarchiveView.as_view(), name='workspace-unarchive'),

    # Workspace Members
    path('<slug:slug>/members/', views.WorkspaceMembersView.as_view(), name='workspace-members'),
    path('<slug:slug>/members/<uuid:user_id>/', views.WorkspaceMemberDetailView.as_view(), name='workspace-member-detail'),

    # Workspace Invitations
    path('<slug:slug>/invites/', views.WorkspaceInviteListCreateView.as_view(), name='workspace-invites'),
    path('<slug:slug>/invites/<uuid:invite_id>/', views.WorkspaceInviteRevokeView.as_view(), name='workspace-invite-revoke'),
]
