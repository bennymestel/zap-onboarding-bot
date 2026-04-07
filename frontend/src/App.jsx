import { Routes, Route } from 'react-router-dom'
import ChatBot from '@/components/ChatBot'
import AdminPage from '@/components/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatBot />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}
