import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PublicProfileLayout } from './components/layout/PublicProfileLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/ui/Toaster'
import { AdminPage } from './pages/AdminPage'
import { ActivityPage } from './pages/ActivityPage'
import { ExplorePage } from './pages/ExplorePage'
import { InsightsPage } from './pages/InsightsPage'
import { LandingPage } from './pages/LandingPage'
import { LibraryPage } from './pages/LibraryPage'
import { MyBooksPage } from './pages/MyBooksPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { ShelfDetailPage } from './pages/ShelfDetailPage'
import { ShelvesPage } from './pages/ShelvesPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<AppLayout />}>
          <Route path="/explore" element={<ExplorePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/mybooks" element={<MyBooksPage />} />
            <Route path="/shelves" element={<ShelvesPage />} />
            <Route path="/shelves/:shelfId" element={<ShelfDetailPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route element={<PublicProfileLayout />}>
          <Route path="/u/:username" element={<PublicProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toaster />
    </>
  )
}

export default App
