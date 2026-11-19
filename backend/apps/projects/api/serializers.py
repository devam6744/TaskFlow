"""
Project & Backlog Serializers — Phase 4
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.projects.models import (
    Project,
    ProjectMember,
    WorkItem,
    FIBONACCI_STORY_POINTS,
)
from apps.workspaces.api.serializers import UserSummarySerializer

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    """Full representation of a Project."""
    lead = UserSummarySerializer(read_only=True)
    created_by = UserSummarySerializer(read_only=True)
    backlog_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'slug', 'key', 'description', 'visibility',
            'status', 'lead', 'created_by', 'start_date', 'target_date',
            'definition_of_done', 'settings', 'created_at', 'updated_at',
            'is_archived', 'backlog_count'
        ]
        read_only_fields = ['id', 'slug', 'created_by', 'created_at', 'updated_at', 'is_archived']

    def get_backlog_count(self, obj) -> int:
        return obj.work_items.filter(sprint_id__isnull=True, archived_at__isnull=True).count()


class ProjectCreateSerializer(serializers.Serializer):
    """Input serializer for creating a new Project."""
    name = serializers.CharField(max_length=120, required=True, trim_whitespace=True)
    key = serializers.CharField(max_length=6, required=False, allow_blank=True, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    visibility = serializers.ChoiceField(
        choices=Project.Visibility.choices,
        default=Project.Visibility.WORKSPACE
    )
    lead_id = serializers.UUIDField(required=False, allow_null=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    target_date = serializers.DateField(required=False, allow_null=True)
    definition_of_done = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Project name cannot be empty.")
        return value.strip()


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """Input serializer for updating project settings."""
    class Meta:
        model = Project
        fields = ['name', 'description', 'definition_of_done', 'start_date', 'target_date', 'settings']
        extra_kwargs = {field: {'required': False} for field in fields}


class ProjectMemberSerializer(serializers.ModelSerializer):
    """Project membership record."""
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = fields


class ProjectMemberAddSerializer(serializers.Serializer):
    """Add a member to a private project."""
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=ProjectMember.Role.choices,
        default=ProjectMember.Role.MEMBER
    )


class WorkItemSerializer(serializers.ModelSerializer):
    """Full representation of a WorkItem (Story, Task, Bug)."""
    key_identifier = serializers.ReadOnlyField()
    reporter = UserSummarySerializer(read_only=True)
    assignee = UserSummarySerializer(read_only=True)

    class Meta:
        model = WorkItem
        fields = [
            'id', 'item_number', 'key_identifier', 'title', 'description',
            'type', 'priority', 'status', 'story_points', 'acceptance_criteria',
            'reporter', 'assignee', 'due_date', 'backlog_order', 'sprint_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'item_number', 'key_identifier', 'reporter', 'backlog_order', 'created_at', 'updated_at']


class WorkItemCreateSerializer(serializers.Serializer):
    """Input serializer for creating an Agile backlog item."""
    title = serializers.CharField(max_length=255, required=True, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    type = serializers.ChoiceField(choices=WorkItem.Type.choices, default=WorkItem.Type.STORY)
    priority = serializers.ChoiceField(choices=WorkItem.Priority.choices, default=WorkItem.Priority.MEDIUM)
    story_points = serializers.IntegerField(required=False, allow_null=True)
    acceptance_criteria = serializers.CharField(required=False, allow_blank=True, default='')
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)

    def validate_story_points(self, value):
        if value is not None and value not in FIBONACCI_STORY_POINTS:
            raise serializers.ValidationError(
                f"Story points must be one of the Fibonacci sequence: {FIBONACCI_STORY_POINTS}."
            )
        return value


class WorkItemUpdateSerializer(serializers.ModelSerializer):
    """Input serializer for editing a backlog work item."""
    assignee_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = WorkItem
        fields = [
            'title', 'description', 'type', 'priority', 'status',
            'story_points', 'acceptance_criteria', 'due_date', 'assignee_id'
        ]
        extra_kwargs = {field: {'required': False} for field in fields}

    def validate_story_points(self, value):
        if value is not None and value not in FIBONACCI_STORY_POINTS:
            raise serializers.ValidationError(
                f"Story points must be one of the Fibonacci sequence: {FIBONACCI_STORY_POINTS}."
            )
        return value


class WorkItemReorderSerializer(serializers.Serializer):
    """Input serializer for fractional drag-and-drop reordering."""
    prev_item_id = serializers.UUIDField(required=False, allow_null=True)
    next_item_id = serializers.UUIDField(required=False, allow_null=True)
