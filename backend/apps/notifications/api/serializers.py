from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.notifications.models import Notification, NotificationPreference

User = get_user_model()


class NotificationActorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'display_name']


class NotificationSerializer(serializers.ModelSerializer):
    actor = NotificationActorSerializer(read_only=True)
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'event_type',
            'title',
            'description',
            'target_url',
            'payload',
            'read_at',
            'is_read',
            'created_at',
            'actor',
            'workspace_id',
        ]
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()


class NotificationReadAllSerializer(serializers.Serializer):
    workspace_id = serializers.UUIDField(required=False, allow_null=True)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'event_type',
            'event_type_display',
            'in_app_enabled',
            'email_enabled',
            'workspace_id',
        ]


class NotificationPreferenceUpdateSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=Notification.EventType.choices)
    in_app_enabled = serializers.BooleanField(required=False)
    email_enabled = serializers.BooleanField(required=False)
    workspace_id = serializers.UUIDField(required=False, allow_null=True)
