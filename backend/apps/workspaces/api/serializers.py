"""
Workspace Serializers — Phase 3: Multi-Tenancy & Member Management
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvite

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """Compact user representation for member and owner fields."""
    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'avatar_url']
        read_only_fields = fields


class WorkspaceSerializer(serializers.ModelSerializer):
    """Full representation of a Workspace."""
    owner = UserSummarySerializer(read_only=True)
    current_user_role = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'slug', 'description', 'owner',
            'settings_data', 'created_at', 'updated_at',
            'is_archived', 'current_user_role', 'members_count'
        ]
        read_only_fields = ['id', 'slug', 'owner', 'created_at', 'updated_at', 'is_archived']

    def get_current_user_role(self, obj) -> str | None:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = WorkspaceMember.objects.filter(
            workspace=obj,
            user=request.user,
            status=WorkspaceMember.Status.ACTIVE
        ).first()
        return membership.role if membership else None

    def get_members_count(self, obj) -> int:
        return obj.members.filter(status=WorkspaceMember.Status.ACTIVE).count()


class WorkspaceCreateSerializer(serializers.Serializer):
    """Input serializer for creating a new Workspace."""
    name = serializers.CharField(max_length=100, required=True, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Workspace name cannot be empty.")
        return value.strip()


class WorkspaceUpdateSerializer(serializers.ModelSerializer):
    """Input serializer for updating workspace attributes."""
    class Meta:
        model = Workspace
        fields = ['name', 'description', 'settings_data']
        extra_kwargs = {
            'name': {'required': False},
            'description': {'required': False},
            'settings_data': {'required': False},
        }


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    """Workspace member record with nested user details."""
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ['id', 'user', 'role', 'status', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']


class WorkspaceMemberRoleUpdateSerializer(serializers.Serializer):
    """Input serializer to change a member's role."""
    role = serializers.ChoiceField(choices=WorkspaceMember.Role.choices, required=True)


class WorkspaceInviteCreateSerializer(serializers.Serializer):
    """Input serializer to invite a user by email."""
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=WorkspaceMember.Role.choices,
        default=WorkspaceMember.Role.MEMBER,
        required=False
    )

    def validate_email(self, value):
        return value.lower().strip()


class WorkspaceInviteSerializer(serializers.ModelSerializer):
    """Output serializer for workspace invites."""
    invited_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = WorkspaceInvite
        fields = ['id', 'email', 'role', 'status', 'expires_at', 'created_at', 'invited_by']
        read_only_fields = fields


class AcceptInviteSerializer(serializers.Serializer):
    """Input serializer for accepting an invite token."""
    token = serializers.CharField(required=True, trim_whitespace=True)
