import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AlertCircle, ShieldX, Loader2 } from "lucide-react";

// Persistent logger — survives page navigation
const plog = (msg, data) => {
  const entry = `[${new Date().toISOString()}] ${msg}` + (data !== undefined ? `: ${JSON.stringify(data)}` : "");
  console.log(entry);
  const existing = JSON.parse(sessionStorage.getItem("auth_debug") || "[]");
  existing.push(entry);
  sessionStorage.setItem("auth_debug", JSON.stringify(existing.slice(-30))); // keep last 30
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [status, setStatus] = useState("Processing login...");
  const [debugLogs, setDebugLogs] = useState([]);

  // On mount, show any logs from previous navigation
  useEffect(() => {
    const previous = JSON.parse(sessionStorage.getItem("auth_debug") || "[]");
    if (previous.length) setDebugLogs(previous);
    sessionStorage.removeItem("auth_debug");
  }, []);

  useEffect(() => {
    let isMounted = true;

    plog("AuthCallback mounted", { url: window.location.href });

    const handleAuthCallback = async (session) => {
      plog("handleAuthCallback called");
      plog("User ID", session?.user?.id);
      plog("User Email", session?.user?.email);

      try {
        if (!session?.user) {
          plog("ERROR: No user in session");
          if (isMounted) setError("No session found. Please try logging in again.");
          return;
        }

        if (isMounted) setStatus("Checking your account permissions...");

        // Query by ID first
        plog("Querying users table by ID", session.user.id);
        const { data: userDataById, error: idError } = await supabase
          .from("users")
          .select("id, role, department, email")
          .eq("id", session.user.id)
          .single();

        plog("Query by ID result", { data: userDataById, error: idError?.message });

        let userData = userDataById;

        // Fallback: Query by email
        if (!userData && session.user.email) {
          plog("ID lookup failed, trying email", session.user.email);
          const { data: userDataByEmail, error: emailError } = await supabase
            .from("users")
            .select("id, role, department, email")
            .eq("email", session.user.email)
            .single();

          plog("Query by email result", { data: userDataByEmail, error: emailError?.message });
          userData = userDataByEmail;
        }

        plog("Final userData", userData);

        // If still no user found - block access (don't auto-create as student)
        if (!userData) {
          plog("ERROR: No user record found in users table - blocking access");
          if (isMounted) {
            setStatus("");
            setAccessDenied(true);
          }
          await supabase.auth.signOut();
          return;
        }

        const userRole = userData.role;
        const userDepartment = userData.department;

        plog("User role", { role: userRole, department: userDepartment });

        // BLOCK students from accessing admin panel
        if (userRole === "student") {
          plog("BLOCKED: Student role not allowed on admin panel");
          if (isMounted) setAccessDenied(true);
          await supabase.auth.signOut();
          return;
        }

        // BLOCK unverified users (employees without department assignment)
        if ((userRole === "employee" || userRole === "faculty" || userRole === "department") && !userDepartment) {
          plog("BLOCKED: No department assigned");
          if (isMounted) setAccessDenied(true);
          await supabase.auth.signOut();
          return;
        }

        // Redirect based on role
        plog("SUCCESS: Redirecting user with role", userRole);
        if (isMounted) setStatus("Access granted! Redirecting...");

        if (userRole === "super_admin") {
          navigate("/super-admin", { replace: true });
        } else if (userRole === "admin") {
          navigate("/admin", { replace: true });
        } else if (userRole === "department" || userRole === "faculty" || userRole === "employee") {
          navigate("/department", { replace: true });
        } else {
          plog("BLOCKED: Unknown role", userRole);
          if (isMounted) setAccessDenied(true);
          await supabase.auth.signOut();
        }
      } catch (err) {
        plog("EXCEPTION", err.message);
        if (isMounted) setError(`Authentication error: ${err.message}`);
      }
    };

    // Listen for SIGNED_IN (this fires after OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      plog("onAuthStateChange", { event, email: session?.user?.email });
      if (event === "SIGNED_IN" && session?.user) {
        handleAuthCallback(session);
      }
    });

    // Also check existing session (in case the page was refreshed)
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      plog("getSession", { email: session?.user?.email, error: sessionError?.message });
      if (sessionError) {
        if (isMounted) setError(sessionError.message);
        return;
      }
      if (session?.user) {
        handleAuthCallback(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Access Denied Screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldX size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              Your account has not been authorized for admin access.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>This portal is for staff only.</strong><br />
                If you are a faculty, employee, or staff member, please contact
                the super administrator to have your account verified.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-maroon-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-maroon-700 transition-all duration-200"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-maroon-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-maroon-700 transition-all duration-200"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-col gap-4 p-8">
      <div className="text-center">
        <Loader2 size={48} className="animate-spin text-maroon-800 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
      {/* Debug panel - visible on screen */}
      {debugLogs.length > 0 && (
        <div className="w-full max-w-2xl bg-black/90 rounded-xl p-4 text-left mt-4">
          <p className="text-yellow-400 font-bold text-xs mb-2">🔍 Auth Debug Log (send this to your developer):</p>
          {debugLogs.map((log, i) => (
            <p key={i} className="text-green-400 text-xs font-mono break-all">{log}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
