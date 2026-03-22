import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [fbUser, setFbUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFbUser(u)
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        setProfile(snap.exists() ? snap.data() : null)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return <Ctx.Provider value={{ fbUser, profile, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
