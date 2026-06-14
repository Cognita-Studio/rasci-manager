import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LangProvider } from './lib/i18n'
import { ThemeProvider } from './lib/theme'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import ProjectPage from './pages/ProjectPage'

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/:workspaceId" element={<WorkspacePage />} />
            <Route path="/:workspaceId/project/:projectId" element={<ProjectPage />} />
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  )
}
