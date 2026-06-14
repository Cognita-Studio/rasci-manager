import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import ProjectPage from './pages/ProjectPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/:workspaceId" element={<WorkspacePage />} />
        <Route path="/:workspaceId/project/:projectId" element={<ProjectPage />} />
      </Routes>
    </BrowserRouter>
  )
}
