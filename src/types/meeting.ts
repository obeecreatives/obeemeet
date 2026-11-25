import type { Track } from 'livekit-client';

export type ParticipantRole = 'host' | 'participant';
export type ConnectionMode = 'livekit' | 'preview';
export type ScreenSharePreset = 'whiteboard' | 'motion';
export type ReactionEmoji = '👍' | '👏' | '❓';
export type SidePanelTab = 'participants' | 'chat' | 'controls' | null;

export interface CompanionLink {
  url: string;
  label: string;
  updatedAt: number;
}

export interface RoomMetadata {
  roomCode: string;
  title?: string;
  createdAt: number;
  isLocked: boolean;
  spotlightIdentity: string | null;
  companionLink: CompanionLink | null;
}

export interface ParticipantState {
  identity: string;
  name: string;
  role: ParticipantRole;
  isLocal: boolean;
  isSimulated?: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  handRaisedAt: number | null;
  joinedAt: number;
  avatarImage?: string;
  avatarCropClass?: string;
  cameraTrack?: Track | null;
  screenTrack?: Track | null;
  audioTrack?: Track | null;
  localStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
}

export interface ChatMessage {
  id: string;
  senderIdentity: string;
  senderName: string;
  senderRole: ParticipantRole;
  text: string;
  timestamp: number;
}

export interface ReactionEvent {
  id: string;
  senderIdentity: string;
  senderName: string;
  emoji: ReactionEmoji;
  createdAt: number;
  offsetX: number;
}

export interface AttendanceRecord {
  identity: string;
  name: string;
  role: ParticipantRole;
  firstJoinedAt: number;
  lastJoinedAt: number;
  lastLeftAt: number | null;
  accumulatedSeconds: number;
  isOnline: boolean;
}

export interface HealthStatus {
  ok: boolean;
  livekitConfigured: boolean;
  livekitHost: string | null;
}

export interface PreJoinConfig {
  roomCode: string;
  roomTitle?: string;
  isHostIntent: boolean;
  hostPin?: string;
  hostToken?: string;
}

export type AudioProcessingMode = 'standard' | 'studio';
export type VideoQualityPreset = '720p' | '1080p';

export interface DeviceSettingsState {
  audioInputId: string;
  audioOutputId: string;
  videoInputId: string;
  audioMode: AudioProcessingMode;
  videoQuality: VideoQualityPreset;
  mirrorCamera: boolean;
}

export interface ActiveSessionConfig {
  mode: ConnectionMode;
  livekitUrl?: string;
  token?: string;
  roomCode: string;
  identity: string;
  participantName: string;
  role: ParticipantRole;
  hostToken?: string;
  hostPin?: string;
  initialMicOn: boolean;
  initialCameraOn: boolean;
  selectedAudioDeviceId?: string;
  selectedAudioOutputId?: string;
  selectedVideoDeviceId?: string;
  audioMode?: AudioProcessingMode;
  videoQuality?: VideoQualityPreset;
  mirrorCamera?: boolean;
  metadata: RoomMetadata;
}
