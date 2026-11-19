"""
Project & Backlog Models — Phase 4: Product Backlog & Project Entities

Models:
  1. Project        — Top-level agile container scoped to a Workspace.
  2. ProjectMember  — Membership mapping for private project authorization.
  3. WorkItem       — The agile workhorse (Story, Task, Bug, Improvement) with
                      sequential keys (TF-101) and fractional indexing (LexoRank).

Engineering Design:
  • UUID PKs across all entities.
  • Human-readable keys (TF-101) per project using atomic sequence numbering.
  • Fractional Indexing: FloatField backlog_order allows O(1) drag-and-drop reordering.
  • Visibility scoping: WORKSPACE (open to workspace members) vs PRIVATE (restricted list).
  • Fibonacci validation for story points (1, 2, 3, 5, 8, 13, 21).
"""

import uuid
import re
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.workspaces.models import Workspace


FIBONACCI_STORY_POINTS = [1, 2, 3, 5, 8, 13, 21]


def generate_project_slug(name: str) -> str:
    """Convert project name into a URL-safe slug, e.g. 'Customer Portal' -> 'customer-portal'."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug or 'project'


def generate_project_key(name: str) -> str:
    """Generate uppercase 2-5 letter prefix key from project name, e.g. 'TaskFlow' -> 'TF'."""
    words = re.findall(r'[a-zA-Z0-9]+', name)
    if not words:
        return 'PRJ'
    if len(words) == 1:
        key = words[0][:4].upper()
    else:
        key = ''.join(w[0] for w in words[:4]).upper()
    return key if len(key) >= 2 else (name[:2].upper() or 'PR')


class Project(models.Model):
    """
    Project entity scoped to a single Workspace.
    Supports WORKSPACE (open to all workspace members) or PRIVATE visibility.
    """

    class Visibility(models.TextChoices):
        WORKSPACE = 'WORKSPACE', 'Workspace (All Members)'
        PRIVATE = 'PRIVATE', 'Private (Invite Only)'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        ARCHIVED = 'ARCHIVED', 'Archived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='projects',
        help_text="Workspace container this project belongs to"
    )
    name = models.CharField(max_length=120)
    slug = models.SlugField(
        max_length=140,
        db_index=True,
        help_text="URL-friendly identifier unique within the workspace"
    )
    key = models.CharField(
        max_length=10,
        db_index=True,
        help_text="Uppercase prefix for work item keys, e.g. 'TF', 'API'"
    )
    description = models.TextField(blank=True, default='')

    visibility = models.CharField(
        max_length=15,
        choices=Visibility.choices,
        default=Visibility.WORKSPACE,
        db_index=True
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_projects'
    )
    lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lead_projects',
        help_text="Project Lead or Product Owner"
    )

    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    definition_of_done = models.TextField(
        blank=True,
        default='',
        help_text="Shared checklist criteria for acceptance (Definition of Done)"
    )

    settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible project configurations"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'projects_project'
        unique_together = [
            ('workspace', 'slug'),
            ('workspace', 'key'),
        ]
        indexes = [
            models.Index(fields=['workspace', 'status'], name='proj_ws_status_idx'),
            models.Index(fields=['workspace', 'visibility'], name='proj_ws_vis_idx'),
        ]
        ordering = ['-created_at']
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'

    def __str__(self) -> str:
        return f'{self.name} [{self.key}] ({self.workspace.slug})'

    @property
    def is_archived(self) -> bool:
        return self.archived_at is not None

    def archive(self):
        """Soft-archive project without breaking sprint histories."""
        self.archived_at = timezone.now()
        self.status = self.Status.ARCHIVED
        self.save(update_fields=['archived_at', 'status', 'updated_at'])

    def unarchive(self):
        """Restore archived project."""
        self.archived_at = None
        self.status = self.Status.ACTIVE
        self.save(update_fields=['archived_at', 'status', 'updated_at'])

    def save(self, *args, **kwargs):
        # Normalize key to uppercase alphanumeric
        if self.key:
            self.key = re.sub(r'[^A-Z0-9]', '', self.key.upper())[:6]
        else:
            base_key = generate_project_key(self.name)
            key = base_key
            counter = 1
            while Project.objects.filter(workspace=self.workspace, key=key).exclude(pk=self.pk).exists():
                key = f"{base_key}{counter}"[:6]
                counter += 1
            self.key = key

        # Auto-generate unique slug within workspace
        if not self.slug:
            base_slug = generate_project_slug(self.name)
            slug = base_slug
            counter = 1
            while Project.objects.filter(workspace=self.workspace, slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        super().save(*args, **kwargs)


class ProjectMember(models.Model):
    """
    Project-level membership table for PRIVATE projects.
    Workspace OWNERs bypass this table and always have access.
    """

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Project Admin'
        MEMBER = 'MEMBER', 'Project Member'
        VIEWER = 'VIEWER', 'Viewer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='project_memberships'
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.MEMBER,
        db_index=True
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects_projectmember'
        unique_together = [('project', 'user')]
        indexes = [
            models.Index(fields=['project', 'user'], name='proj_mem_proj_usr_idx'),
        ]
        ordering = ['joined_at']
        verbose_name = 'Project Member'
        verbose_name_plural = 'Project Members'

    def __str__(self) -> str:
        return f'{self.user.email} -> {self.project.key} [{self.role}]'


class WorkItem(models.Model):
    """
    The fundamental unit of agile work (Story, Task, Bug, Improvement).
    Lives inside a Project and Product Backlog until assigned to a Sprint.
    """

    class Type(models.TextChoices):
        STORY = 'STORY', 'Story'
        TASK = 'TASK', 'Task'
        BUG = 'BUG', 'Bug'
        IMPROVEMENT = 'IMPROVEMENT', 'Improvement'

    class Priority(models.TextChoices):
        URGENT = 'URGENT', 'Urgent'
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'

    class Status(models.TextChoices):
        BACKLOG = 'BACKLOG', 'Backlog'
        TODO = 'TODO', 'To Do'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        IN_REVIEW = 'IN_REVIEW', 'In Review'
        DONE = 'DONE', 'Done'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='work_items'
    )
    item_number = models.PositiveIntegerField(
        help_text="Sequential integer within the project (e.g. 1 -> TF-1)"
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')

    type = models.CharField(
        max_length=15,
        choices=Type.choices,
        default=Type.STORY,
        db_index=True
    )
    priority = models.CharField(
        max_length=15,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.BACKLOG,
        db_index=True
    )

    story_points = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Fibonacci points (1, 2, 3, 5, 8, 13, 21)"
    )
    acceptance_criteria = models.TextField(
        blank=True,
        default='',
        help_text="Conditions required for this story/task to be accepted"
    )

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='reported_work_items'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_work_items'
    )
    due_date = models.DateField(null=True, blank=True)

    # Fractional Indexing (LexoRank style) for O(1) drag-and-drop reordering
    backlog_order = models.FloatField(
        default=0.0,
        db_index=True,
        help_text="Positional index for backlog ranking"
    )

    # Sprint association (Nullable - Phase 5 connects Sprints)
    sprint_id = models.UUIDField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'projects_workitem'
        unique_together = [('project', 'item_number')]
        indexes = [
            models.Index(fields=['project', 'status', 'backlog_order'], name='wi_proj_status_order_idx'),
            models.Index(fields=['project', 'type'], name='wi_proj_type_idx'),
            models.Index(fields=['assignee', 'status'], name='wi_assignee_status_idx'),
        ]
        ordering = ['backlog_order', '-created_at']
        verbose_name = 'Work Item'
        verbose_name_plural = 'Work Items'

    def __str__(self) -> str:
        return f'{self.key_identifier}: {self.title}'

    @property
    def key_identifier(self) -> str:
        """Returns JIRA/Linear style human identifier, e.g. 'TF-42'."""
        return f'{self.project.key}-{self.item_number}'

    def clean(self):
        super().clean()
        if self.story_points is not None and self.story_points not in FIBONACCI_STORY_POINTS:
            raise ValidationError({
                'story_points': f'Story points must be one of {FIBONACCI_STORY_POINTS}.'
            })
