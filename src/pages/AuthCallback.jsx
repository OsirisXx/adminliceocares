import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AlertCircle, ShieldX, Loader2 } from "lucide-react";

const CALLBACK_TIMEOUT_MS = 8000;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [status, setStatus] = useState("Processing login...");
  const processedUserId = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let subscription;
    let timeoutId;

    const showError = (message) => {
      if (isMounted) setError(message);
    };

    const denyAccess = async () => {
      if (isMounted) {
        setStatus("");
        setAccessDenied(true);
      }
      await supabase.auth.signOut();
    };

    const handleAuthCallback = async (session) => {
      if (!session?.user || processedUserId.current === session.user.id) return;
      processedUserId.current = session.user.id;

      try {
        if (isMounted) setStatus("Checking your account permissions...");

        const { data: userDataById } = await supabase
          .from("users")
          .select("id, role, department, email")
          .eq("id", session.user.id)
          .maybeSingle();

        let userData = userDataById;
        if (!userData && session.user.email) {
          const { data: userDataByEmail } = await supabase
            .from("users")
            .select("id, role, department, email")
            .eq("email", session.user.email)
            .maybeSingle();
          userData = userDataByEmail;
        }

        if (!userData) {
          await denyAccess();
          return;
        }

        const { role: userRole, department: userDepartment } = userData;
        if (
          userRole === "student" ||
          ((userRole === "employee" || userRole === "faculty" || userRole === "department") && !userDepartment)
        ) {
          await denyAccess();
          return;
        }

        if (isMounted) setStatus("Access granted! Redirecting...");
        if (userRole === "super_admin") {
          navigate("/super-admin", { replace: true });
        } else if (userRole === "admin") {
          navigate("/admin", { replace: true });
        } else if (userRole === "department" || userRole === "faculty" || userRole === "employee") {
          navigate("/department", { replace: true });
        } else {
          await denyAccess();
        }
      } catch {
        showError("We could not verify your account permissions. Please try again or contact an administrator.");
      }
    };

    const resolveSession = async () => {
      const callbackError = new URLSearchParams(window.location.search).get("error");
      if (callbackError) {
        showError("Google sign-in was not completed. Please return to login and try again.");
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          showError("We could not complete your sign-in. Please try again.");
          return;
        }

        if (session?.user) {
          await handleAuthCallback(session);
          return;
        }

        const authState = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === "SIGNED_IN" && newSession?.user) {
            window.clearTimeout(timeoutId);
            subscription?.unsubscribe();
            handleAuthCallback(newSession);
          }
        });
        subscription = authState.data.subscription;
        timeoutId = window.setTimeout(() => {
          subscription?.unsubscribe();
          showError("Sign-in timed out. Please return to login and try again.");
        }, CALLBACK_TIMEOUT_MS);
      } catch {
        showError("An error occurred during authentication. Please try again.");
      }
    };

    resolveSession();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
      <div className="text-center">
        <Loader2 size={48} className="animate-spin text-maroon-800 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
