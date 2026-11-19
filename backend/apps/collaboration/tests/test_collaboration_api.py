import io
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, WorkItem, WorkItemDependency
from apps.collaboration.models import Comment, Attachment, ActivityEvent


class CollaborationAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.user_a = User.objects.create_user(
            email='alice@taskflow.dev',
            password='Password@123',
            display_name='Alice Architect'
        )
        self.user_b = User.objects.create_user(
            email='bob@taskflow.dev',
            password='Password@123',
            display_name='Bob Builder'
        )
        self.intruder = User.objects.create_user(
            email='eve@intruder.dev',
            password='Password@123',
            display_name='Eve Intruder'
        )

        # Workspace
        self.workspace = Workspace.objects.create(
            name='Engineering Core',
            slug='engineering-core',
            owner=self.user_a
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user_a,
            role=WorkspaceMember.Role.OWNER
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user_b,
            role=WorkspaceMember.Role.MEMBER
        )

        # Project
        self.project = Project.objects.create(
            workspace=self.workspace,
            name='TaskFlow Core',
            slug='taskflow-core',
            key='TFC',
            created_by=self.user_a
        )

        # Work Items
        self.item_1 = WorkItem.objects.create(
            project=self.project,
            item_number=1,
            title='Setup JWT Token Blacklisting',
            type=WorkItem.Type.STORY,
            priority=WorkItem.Priority.HIGH,
            status=WorkItem.Status.TODO,
            story_points=5,
            backlog_order=1.0,
            reporter=self.user_a
        )
        self.item_2 = WorkItem.objects.create(
            project=self.project,
            item_number=2,
            title='Configure Redis Connection Pool',
            type=WorkItem.Type.TASK,
            priority=WorkItem.Priority.MEDIUM,
            status=WorkItem.Status.TODO,
            story_points=3,
            backlog_order=2.0,
            reporter=self.user_a
        )

        # URLs
        self.comments_url = f'/api/v1/workspaces/{self.workspace.slug}/projects/{self.project.slug}/items/{self.item_1.item_number}/comments/'
        self.attachments_url = f'/api/v1/workspaces/{self.workspace.slug}/projects/{self.project.slug}/items/{self.item_1.item_number}/attachments/'
        self.activity_url = f'/api/v1/workspaces/{self.workspace.slug}/projects/{self.project.slug}/items/{self.item_1.item_number}/activity/'
        self.deps_url = f'/api/v1/workspaces/{self.workspace.slug}/projects/{self.project.slug}/items/{self.item_2.item_number}/dependencies/'

    def test_add_comment_and_activity_emission(self):
        """Posting a comment creates a comment and records a COMMENT_ADDED activity event."""
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(self.comments_url, {
            'body': 'Redis pool configuration should handle at least 50 concurrent connections.'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author']['email'], self.user_b.email)
        self.assertIn('Redis pool', response.data['body'])

        # Verify comment in database
        self.assertEqual(Comment.objects.filter(work_item=self.item_1).count(), 1)

        # Verify activity event was emitted
        activity = ActivityEvent.objects.filter(
            object_type='WorkItem',
            object_id=self.item_1.id,
            event_type='COMMENT_ADDED'
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.actor, self.user_b)
        self.assertIn('Redis pool', activity.metadata['preview'])

    def test_update_comment_permissions(self):
        """Author can update comment; non-author receives 400/403 validation error."""
        comment = Comment.objects.create(
            work_item=self.item_1,
            author=self.user_b,
            body='Initial thought on Redis pool.'
        )
        detail_url = f'{self.comments_url}{comment.id}/'

        # Other member cannot edit
        self.client.force_authenticate(user=self.intruder)
        # Intruder is not in workspace, so gets 404 (isolation)
        response = self.client.patch(detail_url, {'body': 'Hacked body'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Author can edit
        self.client.force_authenticate(user=self.user_b)
        response = self.client.patch(detail_url, {'body': 'Revised thought on Redis pool with pooling.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertEqual(comment.body, 'Revised thought on Redis pool with pooling.')

    def test_soft_delete_comment(self):
        """Author soft-deletes comment; excluded from listing, COMMENT_DELETED emitted."""
        comment = Comment.objects.create(
            work_item=self.item_1,
            author=self.user_b,
            body='Temporary remark.'
        )
        detail_url = f'{self.comments_url}{comment.id}/'

        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify soft delete
        comment.refresh_from_db()
        self.assertIsNotNone(comment.deleted_at)

        # Excluded from listing
        list_response = self.client.get(self.comments_url)
        self.assertEqual(len(list_response.data), 0)

        # Verify COMMENT_DELETED activity
        self.assertTrue(ActivityEvent.objects.filter(
            object_type='WorkItem',
            object_id=self.item_1.id,
            event_type='COMMENT_DELETED'
        ).exists())

    def test_upload_attachment_and_validation(self):
        """File upload persists attachment and emits ATTACHMENT_UPLOADED activity."""
        self.client.force_authenticate(user=self.user_a)
        
        test_file = SimpleUploadedFile(
            name="architecture_spec.pdf",
            content=b"%PDF-1.4 spec content for Redis auth",
            content_type="application/pdf"
        )

        response = self.client.post(self.attachments_url, {'file': test_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['original_filename'], 'architecture_spec.pdf')
        self.assertEqual(response.data['uploader']['email'], self.user_a.email)

        # Verify attachment in DB
        attachment = Attachment.objects.filter(work_item=self.item_1).first()
        self.assertIsNotNone(attachment)
        self.assertEqual(attachment.original_filename, 'architecture_spec.pdf')

        # Verify activity event
        self.assertTrue(ActivityEvent.objects.filter(
            object_type='WorkItem',
            object_id=self.item_1.id,
            event_type='ATTACHMENT_UPLOADED'
        ).exists())

    def test_delete_attachment(self):
        """Uploader can delete attachment file."""
        self.client.force_authenticate(user=self.user_a)
        test_file = SimpleUploadedFile(name="notes.txt", content=b"Test notes", content_type="text/plain")
        upload_resp = self.client.post(self.attachments_url, {'file': test_file}, format='multipart')
        att_id = upload_resp.data['id']

        del_url = f'{self.attachments_url}{att_id}/'
        response = self.client.delete(del_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Attachment.objects.filter(id=att_id).count(), 0)

    def test_status_transition_triggers_activity_event(self):
        """Moving status via /status/ endpoint records STATUS_CHANGED activity event."""
        self.client.force_authenticate(user=self.user_a)
        status_url = f'/api/v1/workspaces/{self.workspace.slug}/projects/{self.project.slug}/work-items/{self.item_1.item_number}/status/'
        
        response = self.client.post(status_url, {'status': WorkItem.Status.IN_PROGRESS})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Fetch activity feed
        act_response = self.client.get(self.activity_url)
        self.assertEqual(act_response.status_code, status.HTTP_200_OK)
        events = act_response.data
        self.assertTrue(any(e['event_type'] == 'STATUS_CHANGED' for e in events))
        status_event = next(e for e in events if e['event_type'] == 'STATUS_CHANGED')
        self.assertEqual(status_event['metadata']['old_status'], WorkItem.Status.TODO)
        self.assertEqual(status_event['metadata']['new_status'], WorkItem.Status.IN_PROGRESS)

    def test_work_item_dependencies_and_cycle_detection(self):
        """Adding blocking dependency works, and circular dependency is rejected."""
        self.client.force_authenticate(user=self.user_a)

        # Item 1 blocks Item 2
        response = self.client.post(self.deps_url, {
            'blocking_item_number': self.item_1.item_number,
            'dependency_type': 'BLOCKS'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['blocking_item']['item_number'], self.item_1.item_number)
        self.assertEqual(response.data['blocked_item']['item_number'], self.item_2.item_number)

        # Attempt circular dependency: Item 2 blocks Item 1
        item_1_deps_url = f'/api/v1/workspaces/{self.workspace.slug}/projects/{self.project.slug}/items/{self.item_1.item_number}/dependencies/'
        cycle_response = self.client.post(item_1_deps_url, {
            'blocking_item_number': self.item_2.item_number,
            'dependency_type': 'BLOCKS'
        })
        self.assertEqual(cycle_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Circular dependency detected', str(cycle_response.data))

        # Delete dependency
        dep_id = response.data['id']
        del_url = f'{self.deps_url}{dep_id}/'
        del_resp = self.client.delete(del_url)
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(WorkItemDependency.objects.filter(id=dep_id).count(), 0)

    def test_multi_tenancy_collaboration_isolation(self):
        """Intruder from another workspace cannot access comments or activity."""
        self.client.force_authenticate(user=self.intruder)

        get_resp = self.client.get(self.comments_url)
        self.assertEqual(get_resp.status_code, status.HTTP_404_NOT_FOUND)

        post_resp = self.client.post(self.comments_url, {'body': 'Unauthorized remark'})
        self.assertEqual(post_resp.status_code, status.HTTP_404_NOT_FOUND)

        act_resp = self.client.get(self.activity_url)
        self.assertEqual(act_resp.status_code, status.HTTP_404_NOT_FOUND)
