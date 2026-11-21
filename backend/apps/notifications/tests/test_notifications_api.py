import uuid
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, WorkItem, Sprint
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import create_notification
from apps.notifications.tasks import check_overdue_tasks
from apps.projects.services import update_work_item
from apps.collaboration.services import add_comment

User = get_user_model()


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            email='alice@example.com',
            password='Password123!',
            display_name='Alice Architect'
        )
        self.user_b = User.objects.create_user(
            email='bob@example.com',
            password='Password123!',
            display_name='Bob Builder'
        )
        self.workspace = Workspace.objects.create(
            name='Acme Corp',
            slug='acme-corp',
            owner=self.user_a
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user_a,
            role=WorkspaceMember.Role.OWNER,
            status=WorkspaceMember.Status.ACTIVE
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user_b,
            role=WorkspaceMember.Role.MEMBER,
            status=WorkspaceMember.Status.ACTIVE
        )
        self.project = Project.objects.create(
            workspace=self.workspace,
            name='Core API',
            slug='core-api',
            key='API',
            lead=self.user_a,
            created_by=self.user_a
        )
        self.work_item = WorkItem.objects.create(
            project=self.project,
            item_number=1,
            title='Implement Notification Engine',
            reporter=self.user_a,
            assignee=self.user_b,
            story_points=5
        )

    def test_list_notifications_and_unread_count(self):
        """User can list their notifications and retrieve accurate unread count."""
        # Create 2 unread notifications for Bob
        create_notification(
            recipient_id=str(self.user_b.id),
            actor_id=str(self.user_a.id),
            workspace_id=str(self.workspace.id),
            event_type=Notification.EventType.TASK_ASSIGNED,
            title='Assigned to API-1',
            idempotency_key='test-key-1'
        )
        create_notification(
            recipient_id=str(self.user_b.id),
            actor_id=str(self.user_a.id),
            workspace_id=str(self.workspace.id),
            event_type=Notification.EventType.COMMENT_ADDED,
            title='New comment on API-1',
            idempotency_key='test-key-2'
        )

        self.client.force_authenticate(user=self.user_b)

        # Check unread count
        count_res = self.client.get('/api/v1/notifications/unread-count/')
        self.assertEqual(count_res.status_code, status.HTTP_200_OK)
        self.assertEqual(count_res.data['unread_count'], 2)

        # Check list
        list_res = self.client.get('/api/v1/notifications/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 2)
        self.assertEqual(list_res.data[0]['actor']['email'], self.user_a.email)

    def test_mark_single_notification_read(self):
        """User can mark a specific notification as read."""
        notif = create_notification(
            recipient_id=str(self.user_b.id),
            event_type=Notification.EventType.TASK_ASSIGNED,
            title='Assigned to API-1',
            idempotency_key='test-read-single'
        )

        self.client.force_authenticate(user=self.user_b)
        res = self.client.post(f'/api/v1/notifications/{notif.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_read'])
        self.assertIsNotNone(res.data['read_at'])

        # Unread count should now be 0
        count_res = self.client.get('/api/v1/notifications/unread-count/')
        self.assertEqual(count_res.data['unread_count'], 0)

    def test_mark_all_notifications_read(self):
        """User can mark all their unread notifications as read in bulk."""
        for i in range(3):
            create_notification(
                recipient_id=str(self.user_b.id),
                event_type=Notification.EventType.TASK_ASSIGNED,
                title=f'Alert {i}',
                idempotency_key=f'bulk-read-{i}'
            )

        self.client.force_authenticate(user=self.user_b)
        res = self.client.post('/api/v1/notifications/read-all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['marked_read_count'], 3)

        count_res = self.client.get('/api/v1/notifications/unread-count/')
        self.assertEqual(count_res.data['unread_count'], 0)

    def test_idempotency_key_prevents_duplicate_notifications(self):
        """Re-dispatching with the same idempotency_key returns existing record without duplicating."""
        key = 'idempotent-task-assign-123'
        notif1 = create_notification(
            recipient_id=str(self.user_b.id),
            event_type=Notification.EventType.TASK_ASSIGNED,
            title='Task Assigned',
            idempotency_key=key
        )
        notif2 = create_notification(
            recipient_id=str(self.user_b.id),
            event_type=Notification.EventType.TASK_ASSIGNED,
            title='Task Assigned Duplicate Call',
            idempotency_key=key
        )

        self.assertEqual(notif1.id, notif2.id)
        self.assertEqual(Notification.objects.filter(idempotency_key=key).count(), 1)

    def test_muted_notification_preference_suppresses_creation(self):
        """If user disables in-app and email for an event type, creation is suppressed."""
        NotificationPreference.objects.create(
            user=self.user_b,
            workspace=self.workspace,
            event_type=Notification.EventType.COMMENT_ADDED,
            in_app_enabled=False,
            email_enabled=False
        )

        notif = create_notification(
            recipient_id=str(self.user_b.id),
            actor_id=str(self.user_a.id),
            workspace_id=str(self.workspace.id),
            event_type=Notification.EventType.COMMENT_ADDED,
            title='Should be muted',
            idempotency_key='muted-key-1'
        )
        self.assertIsNone(notif)
        self.assertFalse(Notification.objects.filter(idempotency_key='muted-key-1').exists())

    def test_user_preferences_api(self):
        """User can fetch and update their notification preferences via REST API."""
        self.client.force_authenticate(user=self.user_b)

        # GET preferences (auto-populates defaults)
        get_res = self.client.get('/api/v1/notifications/preferences/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertGreater(len(get_res.data), 0)

        # PATCH to mute email for TASK_ASSIGNED
        patch_res = self.client.patch('/api/v1/notifications/preferences/', {
            'event_type': Notification.EventType.TASK_ASSIGNED,
            'email_enabled': False
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertFalse(patch_res.data['email_enabled'])

        # Verify in DB
        pref = NotificationPreference.objects.get(
            user=self.user_b,
            event_type=Notification.EventType.TASK_ASSIGNED
        )
        self.assertFalse(pref.email_enabled)

    def test_workspace_isolation_on_notifications(self):
        """Alice cannot read or mark Bob's private notifications as read."""
        notif_bob = create_notification(
            recipient_id=str(self.user_b.id),
            event_type=Notification.EventType.TASK_ASSIGNED,
            title='Secret alert for Bob',
            idempotency_key='bob-secret-1'
        )

        # Alice authenticates
        self.client.force_authenticate(user=self.user_a)

        # Alice checks her list: Bob's notification is not present
        list_res = self.client.get('/api/v1/notifications/')
        self.assertEqual(len(list_res.data), 0)

        # Alice attempts to mark Bob's notification as read -> 404
        read_res = self.client.post(f'/api/v1/notifications/{notif_bob.id}/read/')
        self.assertEqual(read_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_comment_added_triggers_notification_for_assignee(self):
        """Adding a comment to API-1 (assigned to Bob) automatically creates a notification for Bob."""
        # Alice comments on API-1 (using captureOnCommitCallbacks to execute Celery dispatch)
        with self.captureOnCommitCallbacks(execute=True):
            comment = add_comment(
                work_item=self.work_item,
                author=self.user_a,
                body="Can you please review the DB schema index?"
            )
        self.assertIsNotNone(comment)

        # Verify notification created for Bob
        notif = Notification.objects.filter(
            recipient=self.user_b,
            event_type=Notification.EventType.COMMENT_ADDED
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn('API-1', notif.title)
        self.assertEqual(notif.actor, self.user_a)

    def test_check_overdue_tasks_cron(self):
        """check_overdue_tasks detects past-due uncompleted items and alerts assignee."""
        yesterday = timezone.now().date() - timedelta(days=2)
        self.work_item.due_date = yesterday
        self.work_item.save()

        created_count = check_overdue_tasks()
        self.assertGreaterEqual(created_count, 1)

        overdue_notif = Notification.objects.filter(
            recipient=self.user_b,
            event_type=Notification.EventType.TASK_OVERDUE
        ).first()
        self.assertIsNotNone(overdue_notif)
        self.assertIn('Task Overdue', overdue_notif.title)
        self.assertIn(str(yesterday), overdue_notif.description)

        # Idempotency test: Running again on the same day should create 0 new notifications
        second_run_count = check_overdue_tasks()
        self.assertEqual(second_run_count, 0)
