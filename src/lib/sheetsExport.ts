import { supabase } from './supabase'

const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const REDIRECT_URI  = `${window.location.origin}/settings/sheets`

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

export class SheetsExportError extends Error {
  constructor(message: string) { super(message); this.name = 'SheetsExportError' }
}

// ---- OAuth ----
// The token exchange itself happens server-side, in api/google-oauth-
// callback.ts — GOOGLE_CLIENT_SECRET is a server-only env var (no VITE_
// prefix) and never reaches the client bundle. The client only ever needs
// its public client_id to build the auth URL.

export function credentialsConfigured(): boolean {
  return !!CLIENT_ID
}

export function getAuthUrl(): string {
  if (!credentialsConfigured()) {
    throw new SheetsExportError('Google client ID not configured in .env.local')
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
  const res = await fetch('/api/google-oauth-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
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

// ---- Sheet selection (Task 2, PRD §9.1: "selects or creates") ----
// Google Picker would need its own API key + extra script-tag integration;
// PRD explicitly allows the simpler "paste a Sheet URL" fallback instead.

// Accepts a full Google Sheets URL (.../spreadsheets/d/{id}/edit#gid=0) or a
// bare spreadsheet ID pasted directly.
export function parseSheetIdFromUrl(input: string): string | null {
  const trimmed = input.trim()
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed
  return null
}

export async function linkExistingSheet(urlOrId: string): Promise<void> {
  const id = parseSheetIdFromUrl(urlOrId)
  if (!id) throw new SheetsExportError('Could not find a Sheet ID in that link')
  const res = await _apiGet(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties.title`)
  if (!res.ok) throw new SheetsExportError('Could not open that spreadsheet — check the link and sharing permissions')
  const json = await res.json() as { properties: { title: string } }
  storeSheetId(id, json.properties.title)
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

// The canonical 6 tabs (PRD §9.1) — Games is deliberately folded into
// Matches (Task 3 ruling), not a 7th tab.
const TAB_NAMES = ['Sessions', 'Matches', 'Competitive Games', 'Drills', 'Players', 'Career Stats']

// Adds any of TAB_NAMES missing from a spreadsheet — a no-op for a
// freshly-created one (already has all of them), but needed when linking
// an existing sheet via linkExistingSheet() that predates this schema.
async function ensureTabs(sheetId: string): Promise<void> {
  const res = await _apiGet(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`)
  if (!res.ok) throw new SheetsExportError('Could not read spreadsheet structure')
  const json = await res.json() as { sheets: { properties: { title: string } }[] }
  const existing = new Set(json.sheets.map(s => s.properties.title))
  const missing = TAB_NAMES.filter(t => !existing.has(t))
  if (missing.length === 0) return
  const res2 = await apiPost(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    requests: missing.map(title => ({ addSheet: { properties: { title } } })),
  })
  if (!res2.ok) throw new SheetsExportError('Could not add missing tabs to the linked spreadsheet')
}

// ---- Export ----

type Row  = (string | number | null)[]
type SheetData = Row[]

export interface ExportMatchRow {
  id: string
  session_id: string
  format: string
  target_score?: number | null
  scoring_style: string
  started_at: string
  ended_at?: string | null
}

export interface ExportGameRow {
  id: string
  match_id: string
  game_number: number
  team_a_score: number
  team_b_score: number
  duration_seconds: number
  started_at?: string | null
  ended_at?: string | null
}

// Matches: one row per match (row_type 'match') immediately followed by
// that match's own game rows (row_type 'game') — Task 3 ruling folds Games
// into this tab instead of a 7th standalone one. Both row shapes share one
// column set; each leaves the other shape's columns null. Extracted as a
// pure function so the folding rule is unit-testable without a live
// Supabase/fetch round trip.
export function buildMatchesRows(matches: ExportMatchRow[], games: ExportGameRow[]): Row[] {
  return matches.flatMap(m => {
    const mg = games.filter(g => g.match_id === m.id)
    const aWins = mg.filter(g => g.team_a_score > g.team_b_score).length
    const bWins = mg.filter(g => g.team_b_score > g.team_a_score).length
    const margins = mg.map(g => Math.abs(g.team_a_score - g.team_b_score))
    const avgMargin = margins.length > 0
      ? Math.round(margins.reduce((s, v) => s + v, 0) / margins.length)
      : null
    const matchRow: Row = [
      'match', m.id, null, m.session_id, m.format, m.target_score ?? null, m.scoring_style,
      null, null, null, null, null, null,
      m.started_at, m.ended_at ?? null, mg.length, aWins, bWins, avgMargin,
    ]
    const gameRows: Row[] = mg.map(g => {
      const winner = g.team_a_score > g.team_b_score ? 'Team A'
        : g.team_b_score > g.team_a_score ? 'Team B' : 'Tie'
      return [
        'game', g.id, g.match_id, null, null, null, null,
        g.game_number, g.team_a_score, g.team_b_score,
        winner, Math.abs(g.team_a_score - g.team_b_score), g.duration_seconds,
        g.started_at ?? null, g.ended_at ?? null, null, null, null, null,
      ]
    })
    return [matchRow, ...gameRows]
  })
}

export async function exportToSheets(): Promise<void> {
  if (!isConnected()) throw new SheetsExportError('Not connected to Google')

  let sheetId = localStorage.getItem('tap_sheet_id')

  // Create a new spreadsheet if none is linked yet (linkExistingSheet()
  // covers the "select" half of PRD §9.1's "selects or creates")
  if (!sheetId) {
    const res = await apiPost('https://sheets.googleapis.com/v4/spreadsheets', {
      properties: { title: 'TAP — Export' },
      sheets: TAB_NAMES.map(title => ({ properties: { title } })),
    })
    if (!res.ok) throw new SheetsExportError('Failed to create spreadsheet')
    const json = await res.json() as { spreadsheetId: string; properties: { title: string } }
    sheetId = json.spreadsheetId
    storeSheetId(sheetId, json.properties.title)
  } else {
    await ensureTabs(sheetId)
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

  const sessionsData: SheetData = [
    ['id', 'date', 'location', 'state', 'started_at', 'ended_at', 'notes'],
    ...(sessions.data ?? []).map(s => [
      s.id, s.date, s.location, s.state,
      s.started_at ?? null, s.ended_at ?? null, s.notes ?? null,
    ]),
  ]

  const gamesAll = games.data ?? []
  const matchesData: SheetData = [
    ['row_type', 'id', 'match_id', 'session_id', 'format', 'target_score', 'scoring_style',
     'game_number', 'team_a_score', 'team_b_score', 'winner', 'margin', 'duration_seconds',
     'started_at', 'ended_at', 'total_games', 'team_a_wins', 'team_b_wins', 'avg_margin_pts'],
    ...buildMatchesRows(matches.data ?? [], gamesAll),
  ]

  // Competitive Games: game metadata + per-player result rows
  const compResultsAll = compResults.data ?? []
  const compData: SheetData = [
    ['game_id', 'session_id', 'game_type', 'spot', 'quota_per_player',
     'custom_name', 'started_at', 'player_id', 'rank', 'score', 'makes', 'attempts', 'pct'],
    ...(compGames.data ?? []).flatMap(g => {
      const results = compResultsAll.filter(r => r.game_id === g.id)
      if (results.length === 0) {
        return [[
          g.id, g.session_id, g.game_type,
          g.spot ?? null, g.quota_per_player ?? null, g.custom_name ?? null,
          g.started_at, null, null, null, null, null, null,
        ]]
      }
      return results.map(r => {
        const pct = r.attempts > 0 ? Math.round((r.makes / r.attempts) * 100) : null
        return [
          g.id, g.session_id, g.game_type,
          g.spot ?? null, g.quota_per_player ?? null, g.custom_name ?? null,
          g.started_at, r.player_id, r.rank, r.score ?? null,
          r.makes ?? null, r.attempts ?? null, pct,
        ]
      })
    }),
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

  const tabData = [sessionsData, matchesData, compData, drillsData, playersData, careerData]

  // Clear + write each tab
  for (let i = 0; i < TAB_NAMES.length; i++) {
    const range = `${TAB_NAMES[i]}!A1`
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
