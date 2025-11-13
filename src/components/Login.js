import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import supabase from '../lib/supabaseClient';
export default function Login() {
    async function signInGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: { prompt: 'select_account' }
            }
        });
        if (error)
            alert(`Google sign-in failed: ${error.message}`);
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 p-6", children: _jsxs("div", { className: "w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm", children: [_jsx("h1", { className: "mb-4 text-xl font-semibold text-center", children: "SmartClass Monitor" }), _jsx("button", { className: "btn w-full", onClick: signInGoogle, children: "Continue with Google" }), _jsx("p", { className: "mt-3 text-xs text-slate-500 text-center", children: "You will be redirected to Google, then back here." })] }) }));
}
