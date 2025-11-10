export interface ServerToClientEvents {
  // User events
  userOnline: (data: { userId: string; timestamp: Date }) => void;
  userOffline: (data: { userId: string; timestamp: Date }) => void;
  userTyping: (data: { userId: string; roomId: string }) => void;
  userStoppedTyping: (data: { userId: string; roomId: string }) => void;

  // Notification events
  notification: (data: NotificationData) => void;
  systemAlert: (data: SystemAlertData) => void;

  // Activity events
  activityUpdate: (data: ActivityData) => void;
  presenceUpdate: (data: PresenceData) => void;

  // Room events
  roomJoined: (data: { roomId: string; users: string[] }) => void;
  roomLeft: (data: { roomId: string; userId: string }) => void;
  roomMessage: (data: RoomMessageData) => void;
}

export interface ClientToServerEvents {
  // Connection events
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string }) => void;

  // Activity events
  typing: (data: { roomId: string }) => void;
  stopTyping: (data: { roomId: string }) => void;
  updateActivity: (data: {
    activity: string;
    metadata?: Record<string, unknown>;
  }) => void;

  // Presence events
  updatePresence: (data: {
    status: "online" | "away" | "busy" | "offline";
  }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface NotificationData {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemAlertData {
  type: "maintenance" | "update" | "security" | "performance";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
}

export interface ActivityData {
  userId: string;
  activity: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PresenceData {
  userId: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen: Date;
}

export interface RoomMessageData {
  id: string;
  roomId: string;
  userId: string;
  message: string;
  timestamp: Date;
  type: "text" | "system" | "file";
}
