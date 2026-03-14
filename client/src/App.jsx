import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage   from './pages/HomePage'
import LessonPage from './pages/LessonPage'

/**
 * App — root component.
 * Auth is handled server-side via Google Cloud ADC — no API keys in the frontend.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                                element={<HomePage />} />
        <Route path="/lesson/:subjectSlug/:characterSlug" element={<LessonPage />} />
      </Routes>
    </BrowserRouter>
  )
}
