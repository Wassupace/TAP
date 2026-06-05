import { supabase } from './supabase'

const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID     as string | undefined
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined
const REDIRECT_URI  = `${window.location.origin}/settings/sheets`

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

export class SheetsExportError extends Error {
  constructor(message: string) { super(message); this.name = 'SheetsExportError' }
}

// ---- OAuth ----

export function credentialsConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET
}

export function getAuthUrl(): string {
  if (!credentialsConfigured()) {
    throw new SheetsExportError('Google credentials not configured in .env.local')
  }
  const params = new URLSearchParams({
    client_id:     CLIENT_ID!,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function handleOAuthCallback(code: string): Promise<void> {
  if (!credentialsConfigured()) {
    throw new SheetsExportError('Google credentials not configured in .env.local')
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) throw new SheetsExportError('Token exchange failed')
  const json = await res.json() as { access_token: string; refresh_token?: string }
  localStorage.setItem('tap_google_access_token',  json.access_token)
  if (json.refresh_token) {
    localStorage.setItem('tap_google_refresh_token', json.refresh_token)
  }
}

export function isConnected(): boolean {
  return !!localStorage.getItem('tap_google_access_token')
}

export function getConnectedEmail(): string | null {
  return localStorage.getItem('tap_google_email')
}

export function storeSheetId(id: string, name: string): void {
  localStorage.setItem('tap_sheet_id',   id)
  localStorage.setItem('tap_sheet_name', name)
}

export function getSheetName(): string | null {
  return localStorage.getItem('tap_sheet_name')
}

export function disconnect(): void {
  ;['tap_google_access_token', 'tap_google_refresh_token',
    'tap_google_email', 'tap_sheet_id', 'tap_sheet_name'].forEach(k => localStorage.removeItem(k))
}

// ---- API helpers ----

export async function _apiGet(url: string): Promise<Response> {
  const token = localStorage.getItem('tap_google_access_token')
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
}

async function apiPost(url: string, body: unknown): Promise<Response> {
  const token = localStorage.getItem('tap_google_access_token')
  return fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

// ---- Export ----

type Row  = (string | number | null)[]
type SheetData = Row[]

export async function exportToSheets(): Promise<void> {
  if (!isConnected()) throw new SheetsExportError('Not connected to Google')

  let sheetId = localStorage.getItem('tap_sheet_id')

  // Create a new spreadsheet if none is linked yet
  if (!sheetId) {
    const tabNames = ['Sessions', 'Matches', 'Competitive Games', 'Drills', 'Players', 'Career Stats']
    const res = await apiPost('https://sheets.googleapis.com/v4/spreadsheets', {
      properties: { title: 'TAP — Export' },
      sheets: tabNames.map(title => ({ properties: { title } })),
    })
    if (!res.ok) throw new SheetsExportError('Failed to create spreadsheet')
    const json = await res.json() as { spreadsheetId: string; properties: { title: string } }
    sheetId = json.spreadsheetId
    storeSheetId(sheetId, json.properties.title)
  }

  // Fetch all data from Supabase in parallel
  const [sessions, matches, games, compGames, compResults, drills, heats, players] =
    await Promise.all([
      supabase.from('sessions').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('games').select('*'),
      supabase.from('competitive_games').select('*'),
      supabase.from('competitive_results').select('*'),
      supabase.from('drills').select('*'),
      supabase.from('heat_entries').select('*'),
      supabase.from('players').select('*'),
    ])

  // Suppress unused variable warnings for queries reserved for future use
  void matches
  void games
  void compResults

  const sessionsData: SheetData = [
    ['id', 'date', 'location', 'state', 'started_at', 'ended_at', 'notes'],
    ...(sessions.data ?? []).map(s => [
      s.id, s.date, s.location, s.state,
      s.started_at ?? null, s.ended_at ?? null, s.notes ?? null,
    ]),
  ]

  const matchesData: SheetData = [
    ['id', 'session_id', 'format', 'target_score', 'scoring_style', 'started_at', 'ended_at'],
    ...(matches.data ?? []).map(m => [
      m.id, m.session_id, m.format, m.target_score,
      m.scoring_style, m.started_at, m.ended_at ?? null,
    ]),
  ]

  const compData: SheetData = [
    ['id', 'session_id', 'game_type', 'spot', 'quota_per_player', 'custom_name', 'started_at'],
    ...(compGames.data ?? []).map(g => [
      g.id, g.session_id, g.game_type,
      g.spot ?? null, g.quota_per_player ?? null, g.custom_name ?? null, g.started_at,
    ]),
  ]

  const drillsData: SheetData = [
    ['drill_id', 'session_id', 'shot_type', 'hand', 'spot', 'player_id', 'makes', 'attempts', 'heat_number', 'recorded_at'],
    ...(heats.data ?? []).map(h => {
      const drill = (drills.data ?? []).find(d => d.id === h.drill_id)
      return [
        h.drill_id, drill?.session_id ?? null, drill?.shot_type ?? null,
        h.hand, h.spot ?? null, h.player_id,
        h.makes, h.attempts, h.heat_number, h.recorded_at,
      ]
    }),
  ]

  const playersData: SheetData = [
    ['id', 'name', 'nickname', 'target_ft', 'target_mid', 'target_3pt'],
    ...(players.data ?? []).map(p => [
      p.id, p.name, p.nickname,
      p.target_ft_percent, p.target_mid_percent, p.target_3pt_percent,
    ]),
  ]

  // Career stats: aggregate heat_entries per player/shot_type/hand/spot
  const statMap: Record<string, { makes: number; attempts: number }> = {}
  ;(heats.data ?? []).forEach(h => {
    const drill = (drills.data ?? []).find(d => d.id === h.drill_id)
    if (!drill) return
    const key = `${h.player_id}|${drill.shot_type}|${h.hand}|${h.spot ?? 'none'}`
    if (!statMap[key]) statMap[key] = { makes: 0, attempts: 0 }
    statMap[key].makes    += h.makes
    statMap[key].attempts += h.attempts
  })
  const careerData: SheetData = [
    ['player_id', 'shot_type', 'hand', 'spot', 'total_makes', 'total_attempts', 'percentage'],
    ...Object.entries(statMap).map(([key, { makes, attempts }]) => {
      const [player_id, shot_type, hand, spot] = key.split('|')
      const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0
      return [player_id, shot_type, hand, spot === 'none' ? null : spot, makes, attempts, pct]
    }),
  ]

  const tabNames  = ['Sessions', 'Matches', 'Competitive Games', 'Drills', 'Players', 'Career Stats']
  const tabData   = [sessionsData, matchesData, compData, drillsData, playersData, careerData]

  // Clear + write each tab
  for (let i = 0; i < tabNames.length; i++) {
    const range = `${tabNames[i]}!A1`
    await apiPost(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:clear`,
      {}
    )
    await apiPost(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      { range, majorDimension: 'ROWS', values: tabData[i] },
    )
  }
}
