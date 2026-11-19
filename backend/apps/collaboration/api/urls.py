from django.urls import path
from apps.collaboration.api import views

app_name = 'collaboration'

urlpatterns = [
    # Comments (supports both /items/ and /work-items/)
    path(
        'items/<int:item_number>/comments/',
        views.CommentListCreateView.as_view(),
        name='comment-list-create'
    ),
    path(
        'work-items/<int:item_number>/comments/',
        views.CommentListCreateView.as_view(),
        name='workitem-comment-list-create'
    ),
    path(
        'items/<int:item_number>/comments/<uuid:comment_id>/',
        views.CommentDetailView.as_view(),
        name='comment-detail'
    ),
    path(
        'work-items/<int:item_number>/comments/<uuid:comment_id>/',
        views.CommentDetailView.as_view(),
        name='workitem-comment-detail'
    ),

    # Attachments
    path(
        'items/<int:item_number>/attachments/',
        views.AttachmentListCreateView.as_view(),
        name='attachment-list-create'
    ),
    path(
        'work-items/<int:item_number>/attachments/',
        views.AttachmentListCreateView.as_view(),
        name='workitem-attachment-list-create'
    ),
    path(
        'items/<int:item_number>/attachments/<uuid:attachment_id>/',
        views.AttachmentDetailView.as_view(),
        name='attachment-detail'
    ),
    path(
        'work-items/<int:item_number>/attachments/<uuid:attachment_id>/',
        views.AttachmentDetailView.as_view(),
        name='workitem-attachment-detail'
    ),

    # Activity Audit Feed
    path(
        'items/<int:item_number>/activity/',
        views.ActivityEventListView.as_view(),
        name='activity-list'
    ),
    path(
        'work-items/<int:item_number>/activity/',
        views.ActivityEventListView.as_view(),
        name='workitem-activity-list'
    ),

    # Dependencies (Blocked By)
    path(
        'items/<int:item_number>/dependencies/',
        views.WorkItemDependencyListCreateView.as_view(),
        name='dependency-list-create'
    ),
    path(
        'work-items/<int:item_number>/dependencies/',
        views.WorkItemDependencyListCreateView.as_view(),
        name='workitem-dependency-list-create'
    ),
    path(
        'items/<int:item_number>/dependencies/<uuid:dep_id>/',
        views.WorkItemDependencyDetailView.as_view(),
        name='dependency-detail'
    ),
    path(
        'work-items/<int:item_number>/dependencies/<uuid:dep_id>/',
        views.WorkItemDependencyDetailView.as_view(),
        name='workitem-dependency-detail'
    ),
]
