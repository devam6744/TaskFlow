import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { useSprintStore } from '../../stores/sprintStore';
import { useBacklogStore } from '../../stores/backlogStore';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useToast } from '../../stores/toastStore';
import { useProjectStore } from '../../stores/projectStore';

export function useWebSocket() {
  const { accessToken } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const {
    setStatus,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    recordEventReceived,
  } = useRealtimeStore();

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isIntentionalCloseRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    const workspaceSlug = activeWorkspace?.slug;
    if (!workspaceSlug || !accessToken) {
      if (socketRef.current) {
        isIntentionalCloseRef.current = true;
        socketRef.current.close(1000);
        socketRef.current = null;
      }
      setStatus('disconnected');
      return;
    }

    isIntentionalCloseRef.current = false;
    retryCountRef.current = 0;

    function connect() {
      if (!workspaceSlug || !accessToken) return;

      // Determine proper WebSocket URL (supports local dev on port 8000 and production)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isLocalDev = window.location.port === '5173' || window.location.port === '3000';
      const host = isLocalDev ? `${window.location.hostname}:8000` : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/workspaces/${workspaceSlug}/?token=${encodeURIComponent(
        accessToken
      )}`;

      setStatus(retryCountRef.current === 0 ? 'connecting' : 'reconnecting');

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (ws !== socketRef.current) return;
        setStatus('connected');
        resetReconnectAttempts();
        retryCountRef.current = 0;

        // Start heartbeat ping every 25 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (ws !== socketRef.current) return;
        recordEventReceived();

        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          if (type === 'pong' || type === 'connection_established') {
            return;
          }

          const currentWorkspaceSlug = useWorkspaceStore.getState().activeWorkspace?.slug;
          const currentWorkspaceId = useWorkspaceStore.getState().activeWorkspace?.id;
          const currentProjectSlug = useProjectStore.getState().activeProject?.slug;
          const currentUserId = useAuthStore.getState().user?.id;

          switch (type) {
            case 'work_item_updated': {
              if (currentProjectSlug && currentWorkspaceSlug) {
                useSprintStore.getState().fetchBoard(currentWorkspaceSlug, currentProjectSlug);
                useBacklogStore.getState().fetchBacklog(currentWorkspaceSlug, currentProjectSlug);
              }
              break;
            }

            case 'work_item_reordered': {
              if (currentProjectSlug && currentWorkspaceSlug) {
                useBacklogStore.getState().fetchBacklog(currentWorkspaceSlug, currentProjectSlug);
              }
              break;
            }

            case 'work_item_created': {
              if (currentProjectSlug && currentWorkspaceSlug) {
                useBacklogStore.getState().fetchBacklog(currentWorkspaceSlug, currentProjectSlug);
              }
              break;
            }

            case 'sprint_started': {
              if (currentProjectSlug && currentWorkspaceSlug) {
                useSprintStore.getState().fetchSprints(currentWorkspaceSlug, currentProjectSlug);
                useSprintStore.getState().fetchBoard(currentWorkspaceSlug, currentProjectSlug);
              }
              useToast.getState().addToast({
                type: 'info',
                title: 'Sprint Activated',
                description: `${payload?.sprint_name || 'Sprint'} has started.`,
              });
              break;
            }

            case 'sprint_completed':
            case 'sprint_cancelled': {
              if (currentProjectSlug && currentWorkspaceSlug) {
                useSprintStore.getState().fetchSprints(currentWorkspaceSlug, currentProjectSlug);
                useSprintStore.getState().fetchBoard(currentWorkspaceSlug, currentProjectSlug);
                useBacklogStore.getState().fetchBacklog(currentWorkspaceSlug, currentProjectSlug);
              }
              useToast.getState().addToast({
                type: 'info',
                title: type === 'sprint_completed' ? 'Sprint Completed' : 'Sprint Cancelled',
                description: `${payload?.sprint_name || 'Sprint'} is now closed.`,
              });
              break;
            }

            case 'comment_added': {
              if (currentProjectSlug && currentWorkspaceSlug && payload?.work_item_number) {
                useCollaborationStore
                  .getState()
                  .fetchCollaborationData(
                    currentWorkspaceSlug,
                    currentProjectSlug,
                    payload.work_item_number
                  );
              }

              if (payload?.author?.id && payload.author.id !== currentUserId) {
                useToast.getState().addToast({
                  type: 'info',
                  title: `New Comment on ${payload.key_identifier || 'Task'}`,
                  description: `${payload.author.full_name || 'Teammate'}: "${payload.body?.slice(
                    0,
                    50
                  )}..."`,
                });
              }
              break;
            }

            case 'notification_created': {
              useNotificationStore.getState().fetchUnreadCount(currentWorkspaceId);
              useNotificationStore.getState().fetchNotifications(currentWorkspaceId);

              useToast.getState().addToast({
                type: 'info',
                title: payload?.title || 'New Notification',
                description: payload?.description || '',
              });
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.debug('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        if (ws !== socketRef.current) return;

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (isIntentionalCloseRef.current || event.code === 4001 || event.code === 4003) {
          setStatus('disconnected');
          return;
        }

        setStatus('reconnecting');
        incrementReconnectAttempts();
        retryCountRef.current += 1;

        const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000) + Math.random() * 500;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = (err) => {
        console.debug('WebSocket error encountered:', err);
      };
    }

    connect();

    return () => {
      isIntentionalCloseRef.current = true;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        const s = socketRef.current;
        socketRef.current = null;
        s.close(1000);
      }
      setStatus('disconnected');
    };
  }, [
    activeWorkspace?.slug,
    accessToken,
    setStatus,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    recordEventReceived,
  ]);
}
