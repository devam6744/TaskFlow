from rest_framework import serializers
from apps.accounts.models import User
from apps.collaboration.models import Comment, Attachment, ActivityEvent
from apps.projects.models import WorkItemDependency, WorkItem


class CollaborationUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'display_name']
        read_only_fields = ['id', 'email', 'display_name']


class CommentSerializer(serializers.ModelSerializer):
    author = CollaborationUserSerializer(read_only=True)
    is_edited = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id',
            'work_item',
            'author',
            'body',
            'created_at',
            'updated_at',
            'is_edited',
        ]
        read_only_fields = ['id', 'work_item', 'author', 'created_at', 'updated_at', 'is_edited']

    def get_is_edited(self, obj: Comment) -> bool:
        if not obj.updated_at or not obj.created_at:
            return False
        # Consider edited if updated more than 2 seconds after creation
        return (obj.updated_at - obj.created_at).total_seconds() > 2


class CommentCreateUpdateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000, required=True, allow_blank=False)


class AttachmentSerializer(serializers.ModelSerializer):
    uploader = CollaborationUserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            'id',
            'work_item',
            'uploader',
            'file_url',
            'original_filename',
            'content_type',
            'size_bytes',
            'created_at',
        ]
        read_only_fields = ['id', 'work_item', 'uploader', 'file_url', 'original_filename', 'content_type', 'size_bytes', 'created_at']

    def get_file_url(self, obj: Attachment) -> str:
        request = self.context.get('request')
        if obj.file:
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return ''


class AttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True, help_text="File attachment (Max 10MB)")


class ActivityEventSerializer(serializers.ModelSerializer):
    actor = CollaborationUserSerializer(read_only=True)

    class Meta:
        model = ActivityEvent
        fields = [
            'id',
            'actor',
            'object_type',
            'object_id',
            'event_type',
            'metadata',
            'created_at',
        ]
        read_only_fields = ['id', 'actor', 'object_type', 'object_id', 'event_type', 'metadata', 'created_at']


class WorkItemSummarySerializer(serializers.ModelSerializer):
    key_identifier = serializers.ReadOnlyField()

    class Meta:
        model = WorkItem
        fields = ['id', 'item_number', 'key_identifier', 'title', 'type', 'status', 'priority']
        read_only_fields = fields


class WorkItemDependencySerializer(serializers.ModelSerializer):
    blocking_item = WorkItemSummarySerializer(read_only=True)
    blocked_item = WorkItemSummarySerializer(read_only=True)

    class Meta:
        model = WorkItemDependency
        fields = [
            'id',
            'blocking_item',
            'blocked_item',
            'dependency_type',
            'created_at',
        ]
        read_only_fields = ['id', 'blocking_item', 'blocked_item', 'dependency_type', 'created_at']


class WorkItemDependencyCreateSerializer(serializers.Serializer):
    blocking_item_number = serializers.IntegerField(required=True)
    dependency_type = serializers.CharField(default='BLOCKS', required=False)
