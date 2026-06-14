import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'rasci_workspace_id'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = uuidv4()
      localStorage.setItem(STORAGE_KEY, id)
    }
    navigate(`/${id}`, { replace: true })
  }, [navigate])

  return null
}
