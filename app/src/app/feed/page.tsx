import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FeedScreen } from '@/components/feed'

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get consultant_id (same as user.id in this schema)
  const consultantId = user.id

  return <FeedScreen consultantId={consultantId} />
}
