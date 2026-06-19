import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userDepartment, setUserDepartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)
  const currentUserId = useRef(null)

  const fetchUserRole = async (userId, userEmail) => {
    try {
      // Try by user ID first
      const { data: idData } = await supabase
        .from('users')
        .select('role, department')
        .eq('id', userId)
        .maybeSingle()

      if (idData) {
        setUserRole(idData.role)
        setUserDepartment(idData.department)
        return
      }

      // Fallback: try by email
      if (userEmail) {
        const { data: emailData } = await supabase
          .from('users')
          .select('role, department')
          .eq('email', userEmail)
          .maybeSingle()

        if (emailData) {
          setUserRole(emailData.role)
          setUserDepartment(emailData.department)
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err)
    }
  }

  useEffect(() => {
    // Get initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        currentUserId.current = session.user.id
        setUser(session.user)
        await fetchUserRole(session.user.id, session.user.email)
      }
      initialized.current = true
      setLoading(false)
    }).catch(() => {
      initialized.current = true
      setLoading(false)
    })

    // Listen for auth changes AFTER initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION — handled by getSession above
      if (event === 'INITIAL_SESSION') return

      // Skip if not yet initialized (avoids race on mount)
      if (!initialized.current) return

      if (session?.user) {
        // Only re-fetch role if the user actually changed
        if (currentUserId.current !== session.user.id) {
          currentUserId.current = session.user.id
          setLoading(true)
          setUser(session.user)
          await fetchUserRole(session.user.id, session.user.email)
          setLoading(false)
        } else {
          // Same user (e.g. token refresh) — just update user object silently
          setUser(session.user)
        }
      } else {
        // Signed out
        currentUserId.current = null
        setUser(null)
        setUserRole(null)
        setUserDepartment(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    currentUserId.current = null
    setUser(null)
    setUserRole(null)
    setUserDepartment(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, userRole, userDepartment, loading, signIn, signInWithGoogle, signOut }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-maroon-800 border-t-transparent"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}
