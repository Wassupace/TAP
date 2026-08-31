export type SessionState = 'planned' | 'active' | 'completed'
export type MatchFormat = '1v1' | '2v2' | '3v3' | '4v4' | '5v5'
export type ScoringStyle = 'targetScore' | 'durationWave'
export type ShotType = 'freeThrow' | 'midRange' | 'threePoint' | 'layup' | 'floater' | 'postUp'
export type ShotSpot = 'left0' | 'left45' | 'center' | 'right45' | 'right0'
export type CompetitiveGameType = 'banks' | 'middies' | 'next' | 'generic'
export type ActivityType = 'match' | 'drill' | 'competitiveGame'
export type ChartMode = 'ft' | 'mid' | 'three'
export type Hand = 'left' | 'right'
export type SyncStatus = 'online' | 'offline' | 'syncing'

export const SHOT_SPOTS: ShotSpot[] = ['left0', 'left45', 'center', 'right45', 'right0']
export const SPOT_LABELS: Record<ShotSpot, string> = {
  left0: 'L 0°', left45: 'L 45°', center: 'Top', right45: 'R 45°', right0: 'R 0°',
}
export const FORMAT_TEAM_SIZE: Record<MatchFormat, number> = {
  '1v1': 1, '2v2': 2, '3v3': 3, '4v4': 4, '5v5': 5,
}
export const FORMAT_DEFAULT_TARGET: Record<MatchFormat, number> = {
  '1v1': 11, '2v2': 11, '3v3': 11, '4v4': 11, '5v5': 21,
}
export const ALL_FORMATS: MatchFormat[] = ['1v1', '2v2', '3v3', '4v4', '5v5']
export const ALL_SHOT_TYPES: { type: ShotType; label: string }[] = [
  { type: 'freeThrow',  label: 'Free Throw' },
  { type: 'midRange',   label: 'Mid-Range' },
  { type: 'threePoint', label: 'Three-Point' },
  { type: 'layup',      label: 'Layup' },
  { type: 'floater',    label: 'Floater' },
  { type: 'postUp',     label: 'Post-Up' },
]

export interface Player {
  id: string
  name: string
  nickname: string
  photo_url?: string
  target_ft_percent: number
  target_mid_percent: number
  target_3pt_percent: number
  created_at: string
}

export interface Session {
  id: string
  date: string
  location: string
  state: SessionState
  started_at?: string
  ended_at?: string
  is_recurring: boolean
  recurrence_weekday?: number
  expected_player_ids: string[]
  notes?: string
}

export interface SessionAttendance {
  id: string
  session_id: string
  player_id: string
  is_expected: boolean
  arrived_at?: string
  departed_at?: string
}

export interface ActivityRecord {
  id: string
  session_id: string
  activity_type: ActivityType
  reference_id: string
  created_at: string
  feed_summary?: string
}

export interface Match {
  id: string
  session_id: string
  format: MatchFormat
  target_score?: number
  duration_minutes?: number
  scoring_style: ScoringStyle
  started_at: string
  ended_at?: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
  sub_queue_player_ids: string[]
}

export interface Game {
  id: string
  match_id: string
  game_number: number
  team_a_score: number
  team_b_score: number
  duration_seconds: number
  started_at?: string
  ended_at?: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
}

export interface Drill {
  id: string
  session_id: string
  shot_type: ShotType
  hand: Hand
  selected_spots: ShotSpot[]
  heat_size?: number
  makes_target_per_spot?: number
  player_ids: string[]
  started_at: string
  ended_at?: string
}

export interface HeatEntry {
  id: string
  drill_id: string
  player_id: string
  hand: Hand
  spot?: ShotSpot
  makes: number
  attempts: number
  heat_number: number
  recorded_at: string
}

export interface CompetitiveGame {
  id: string
  session_id: string
  game_type: CompetitiveGameType
  spot?: ShotSpot
  quota_per_player?: number
  custom_name?: string
  player_ids: string[]
  started_at: string
  ended_at?: string
}

export interface CompetitiveResult {
  id: string
  game_id: string
  player_id: string
  rank: number
  score?: number
  makes?: number
  attempts?: number
}

export interface RecapCallout {
  icon: 'trophy' | 'flame' | 'clock' | 'ball' | 'target' | 'bolt'
  label: string
  value: string
}

export interface AttendanceStats {
  totalSessions: number
  streak: number
  lastSeen: string | null
  lastLocation: string | null
}
