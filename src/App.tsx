import { Routes, Route } from 'react-router-dom'
import { IOSInstallBanner } from './components/ui/IOSInstallBanner'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import AttendancePage from './pages/AttendancePage'
import PlayersPage from './pages/PlayersPage'
import PlayerProfilePage from './pages/PlayerProfilePage'
import WinLossPage from './pages/WinLossPage'
import MatchSetupPage from './pages/MatchSetupPage'
import MatchActivePage from './pages/MatchActivePage'
import MatchRecapPage from './pages/MatchRecapPage'
import CompetitiveSetupPage from './pages/CompetitiveSetupPage'
import BanksPage from './pages/BanksPage'
import DrillPage from './pages/DrillPage'
import DrillRecapPage from './pages/DrillRecapPage'
import SessionRecapPage from './pages/SessionRecapPage'
import SettingsPage     from './pages/SettingsPage'
import SheetsExportPage from './pages/SheetsExportPage'

export default function App() {
  return (
    <div className="relative z-10 min-h-dvh">
      <IOSInstallBanner />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/calendar/attendance/:sessionId" element={<AttendancePage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/:id" element={<PlayerProfilePage />} />
        <Route path="/players/:id/wl" element={<WinLossPage />} />
        <Route path="/match/setup" element={<MatchSetupPage />} />
        <Route path="/match/active" element={<MatchActivePage />} />
        <Route path="/match/recap" element={<MatchRecapPage />} />
        <Route path="/activity/setup" element={<CompetitiveSetupPage />} />
        <Route path="/activity/banks" element={<BanksPage />} />
        <Route path="/drill" element={<DrillPage />} />
        <Route path="/drill/recap" element={<DrillRecapPage />} />
        <Route path="/session-recap/:id" element={<SessionRecapPage />} />
        <Route path="/settings"        element={<SettingsPage />} />
        <Route path="/settings/sheets" element={<SheetsExportPage />} />
      </Routes>
    </div>
  )
}
