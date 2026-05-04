import { Session } from '@supabase/supabase-js'
import { useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/src/services/supabase'

export function useAuthSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    const inAuth = segments[0] === 'sign-in'
    if (!session && !inAuth) router.replace('/sign-in')
    else if (session && inAuth) router.replace('/(tabs)')
  }, [session, segments, router])

  return { session }
}
