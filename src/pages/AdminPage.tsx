import { ShieldCheck } from 'lucide-react'
import { PagePlaceholder } from '../components/PagePlaceholder'

export function AdminPage() {
  return (
    <PagePlaceholder
      title="Admin"
      description="Platform control room"
      phase="Phase 6 · Admin & Polish"
      icon={<ShieldCheck size={20} />}
    />
  )
}
