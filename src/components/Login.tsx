import React from 'react'
import supabase from '../lib/supabaseClient'

export default function Login() {
  async function signInGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      }
    })
    if (error) alert(`Google sign-in failed: ${error.message}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-center">SmartClass Monitor</h1>
        <button className="btn w-full" onClick={signInGoogle}>Continue with Google</button>
        <p className="mt-3 text-xs text-slate-500 text-center">You will be redirected to Google, then back here.</p>
      </div>
    </div>
  )
}
