import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  SuperAdminSidebar,
  OverviewSection,
  UsersSection,
  DepartmentsSection,
  IPTrackingSection,
  RateLimitingSection,
  BlockedIPsSection,
  AuditLogsSection,
  SettingsSection,
  UserModal,
  DepartmentModal,
  ConfirmModal,
} from "../components/super-admin";

const departments = [
  { value: "academic", label: "Academic Affairs" },
  { value: "facilities", label: "Facilities Management" },
  { value: "finance", label: "Finance Office" },
  { value: "hr", label: "Human Resources" },
  { value: "security", label: "Security Office" },
  { value: "registrar", label: "Registrar" },
  { value: "student_affairs", label: "Student Affairs" },
];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // UI State
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data State
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [settings, setSettings] = useState({});
  const [loginSessions, setLoginSessions] = useState([]);
  const [rateLimits, setRateLimits] = useState({});
  const [blockedIPs, setBlockedIPs] = useState([]);

  // Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1); // 1: form, 2: confirm, 3: success

  // Search State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");

  // Fetch departments from database
  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setDepartmentsList(data || []);
      return data || [];
    } catch (err) {
      console.error("Error fetching departments:", err);
      return [];
    }
  }, []);

  // Fetch stats for overview
  const fetchStats = useCallback(async () => {
    try {
      const [usersResult, complaintsResult, deptsResult] = await Promise.all([
        supabase.from("users").select("*", { count: "exact" }),
        supabase.from("complaints").select("*", { count: "exact" }),
        supabase
          .from("departments")
          .select("*", { count: "exact" })
          .eq("is_active", true),
      ]);

      const pendingResult = await supabase
        .from("complaints")
        .select("*", { count: "exact" })
        .in("status", ["submitted", "verified", "in_progress"]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalDepartments: deptsResult.count || 0,
        totalComplaints: complaintsResult.count || 0,
        pendingComplaints: pendingResult.count || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  // Fetch complaints for departments
  const fetchComplaints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("audit_trail")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs(data || []);
      setRecentActivity(data?.slice(0, 5) || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    }
  }, []);

  // Fetch IP submissions for IP tracking (real data from complaint_submissions)
  const fetchLoginSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("complaint_submissions")
        .select("*, complaints(reference_number, category, status)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.log(
          "complaint_submissions table may not exist, fetching from complaints"
        );
        // Fallback: get IP data from complaints table
        const { data: complaintsData } = await supabase
          .from("complaints")
          .select("id, reference_number, created_at, ip_address, user_agent")
          .order("created_at", { ascending: false })
          .limit(200);

        setLoginSessions(complaintsData || []);
        return;
      }
      setLoginSessions(data || []);
    } catch (err) {
      console.error("Error fetching IP submissions:", err);
      setLoginSessions([]);
    }
  }, []);

  // Fetch rate limits
  const fetchRateLimits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("rate_limits")
        .select("*")
        .single();

      if (error) {
        // Use default values
        setRateLimits({
          daily_limit: 5,
          weekly_limit: 15,
          monthly_limit: 30,
          yearly_limit: 100,
          cooldown_minutes: 30,
          max_per_session: 3,
          enabled: true,
        });
        return;
      }
      setRateLimits(data || {});
    } catch (err) {
      console.error("Error fetching rate limits:", err);
    }
  }, []);

  // Fetch blocked IPs
  const fetchBlockedIPs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("blocked_ips")
        .select("*")
        .order("blocked_at", { ascending: false });

      if (error) {
        console.log("Using mock blocked IPs data");
        setBlockedIPs([]);
        return;
      }
      setBlockedIPs(data || []);
    } catch (err) {
      console.error("Error fetching blocked IPs:", err);
      setBlockedIPs([]);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching settings:", error);
        return;
      }
      if (data) {
        setSettings({
          emailNotifications: data.email_notifications,
          auditLogging: data.audit_logging,
          twoFactorAuth: data.two_factor_auth,
          maintenanceMode: data.maintenance_mode,
          publicRegistration: data.public_registration,
          autoBackup: data.auto_backup,
          allowGuestLogin: data.allow_guest_login,
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchDepartments(),
        fetchComplaints(),
        fetchAuditLogs(),
        fetchLoginSessions(),
        fetchRateLimits(),
        fetchBlockedIPs(),
        fetchSettings(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [
    fetchStats,
    fetchUsers,
    fetchDepartments,
    fetchComplaints,
    fetchAuditLogs,
    fetchLoginSessions,
    fetchRateLimits,
    fetchBlockedIPs,
    fetchSettings,
  ]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // User CRUD operations
  const handleSaveUser = async (formData, userId) => {
    if (userId) {
      // Update existing user
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          role: formData.role,
          department: formData.department,
          is_active: formData.is_active,
        })
        .eq("id", userId);

      if (error) throw error;
    } else {
      // Create new user using the secure RPC
      const { data: userData, error: rpcError } = await supabase.rpc(
        "create_user_admin",
        {
          user_email: formData.email,
          user_password: formData.password,
          user_full_name: formData.full_name,
          user_role: formData.role,
          user_department: formData.department,
          user_is_active: formData.is_active,
        }
      );

      if (rpcError) {
        console.error("Error creating user via RPC:", rpcError);
        throw new Error(rpcError.message || "Failed to create user");
      }
    }

    await fetchUsers();
    await fetchStats();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", selectedUser.id);

    if (error) throw error;

    setConfirmModalOpen(false);
    setSelectedUser(null);
    await fetchUsers();
    await fetchStats();
  };

  const handleToggleUserStatus = async (user) => {
    const { error } = await supabase
      .from("users")
      .update({ is_active: user.is_active === false })
      .eq("id", user.id);

    if (error) {
      console.error("Error toggling user status:", error);
      return;
    }
    await fetchUsers();
  };

  // Inline update user (for dropdowns)
  const handleInlineUpdateUser = async (userId, updates) => {
    // If role is being changed to 'student', also clear the department
    if (updates.role === "student") {
      updates.department = null;
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error updating user:", error);
      return;
    }
    await fetchUsers();
  };

  // Password change handler
  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordStep(1);
    setPasswordModalOpen(true);
  };

  const handleChangePassword = async () => {
    // Validation
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    // Show first confirmation
    setPasswordStep(2);
  };

  const handleConfirmPasswordChange = async () => {
    setPasswordLoading(true);
    try {
      // Send password reset email instead of using admin API
      // This is safer as it doesn't require service role key on client
      const { error } = await supabase.auth.resetPasswordForEmail(
        selectedUser.email,
        { redirectTo: `${window.location.origin}/login` }
      );

      if (error) throw error;

      setPasswordStep(3); // Show success
    } catch (err) {
      console.error("Error sending password reset:", err);
      setPasswordError(err.message || "Failed to send password reset email");
      setPasswordStep(1);
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setSelectedUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordStep(1);
  };

  // Department CRUD operations
  const handleSaveDepartment = async (formData, deptId) => {
    try {
      if (deptId) {
        // Update existing department
        const { error } = await supabase
          .from("departments")
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", deptId);

        if (error) throw error;
      } else {
        // Create new department
        const { error } = await supabase.from("departments").insert({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          is_active: true,
        });

        if (error) throw error;
      }

      await fetchDepartments();
      await fetchStats();
    } catch (err) {
      console.error("Error saving department:", err);
      throw err;
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("departments")
        .update({ is_active: false })
        .eq("id", selectedDepartment.id);

      if (error) throw error;

      await fetchDepartments();
      await fetchStats();
    } catch (err) {
      console.error("Error deleting department:", err);
    }

    setConfirmModalOpen(false);
    setSelectedDepartment(null);
  };

  // Settings save
  const handleSaveSettings = async (newSettings) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({
          email_notifications: newSettings.emailNotifications,
          audit_logging: newSettings.auditLogging,
          two_factor_auth: newSettings.twoFactorAuth,
          maintenance_mode: newSettings.maintenanceMode,
          public_registration: newSettings.publicRegistration,
          auto_backup: newSettings.autoBackup,
          allow_guest_login: newSettings.allowGuestLogin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;
      setSettings(newSettings);
      console.log("Settings saved to database:", newSettings);
    } catch (err) {
      console.error("Error saving settings:", err);
      // Fallback update local state so UI at least reflects the attempt
      setSettings(newSettings);
    }
  };

  // Rate limits save
  const handleSaveRateLimits = async (newLimits) => {
    try {
      const { error } = await supabase
        .from("rate_limits")
        .upsert({ id: 1, ...newLimits });

      if (error) {
        console.log("Rate limits table may not exist, saving locally");
      }
      setRateLimits(newLimits);
    } catch (err) {
      console.error("Error saving rate limits:", err);
      setRateLimits(newLimits);
    }
  };

  // Block IP
  const handleBlockIP = async (ipAddress) => {
    const newBlockedIP = {
      id: Date.now(),
      ip_address: ipAddress,
      reason: "Blocked from IP tracking",
      duration: "permanent",
      blocked_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("blocked_ips").insert(newBlockedIP);
      if (error) {
        console.log("Blocked IPs table may not exist, saving locally");
      }
    } catch (err) {
      console.error("Error blocking IP:", err);
    }

    setBlockedIPs((prev) => [newBlockedIP, ...prev]);
  };

  // Add blocked IP
  const handleAddBlockedIP = async (ipData) => {
    const newBlockedIP = {
      id: Date.now(),
      ...ipData,
    };

    try {
      const { error } = await supabase.from("blocked_ips").insert(newBlockedIP);
      if (error) {
        console.log("Blocked IPs table may not exist, saving locally");
      }
    } catch (err) {
      console.error("Error adding blocked IP:", err);
    }

    setBlockedIPs((prev) => [newBlockedIP, ...prev]);
  };

  // Unblock IP
  const handleUnblockIP = async (ip) => {
    try {
      const { error } = await supabase
        .from("blocked_ips")
        .delete()
        .eq("id", ip.id);

      if (error) {
        console.log("Error removing from database, removing locally");
      }
    } catch (err) {
      console.error("Error unblocking IP:", err);
    }

    setBlockedIPs((prev) => prev.filter((b) => b.id !== ip.id));
  };

  // Render active section
  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewSection
            stats={stats}
            recentActivity={recentActivity}
            loading={loading}
            complaints={complaints}
          />
        );
      case "users":
        return (
          <UsersSection
            users={users}
            departments={departmentsList}
            loading={loading}
            searchQuery={userSearchQuery}
            setSearchQuery={setUserSearchQuery}
            onAddUser={() => {
              setSelectedUser(null);
              setUserModalOpen(true);
            }}
            onEditUser={(user) => {
              setSelectedUser(user);
              setUserModalOpen(true);
            }}
            onDeleteUser={(user) => {
              setSelectedUser(user);
              setConfirmAction("deleteUser");
              setConfirmModalOpen(true);
            }}
            onToggleStatus={handleToggleUserStatus}
            onUpdateUser={handleInlineUpdateUser}
            onChangePassword={handleOpenPasswordModal}
          />
        );
      case "departments":
        return (
          <DepartmentsSection
            departments={departmentsList}
            complaints={complaints}
            loading={loading}
            searchQuery={departmentSearchQuery}
            setSearchQuery={setDepartmentSearchQuery}
            onAddDepartment={() => {
              setSelectedDepartment(null);
              setDepartmentModalOpen(true);
            }}
            onEditDepartment={(dept) => {
              setSelectedDepartment(dept);
              setDepartmentModalOpen(true);
            }}
            onDeleteDepartment={(dept) => {
              setSelectedDepartment(dept);
              setConfirmAction("deleteDepartment");
              setConfirmModalOpen(true);
            }}
          />
        );
      case "ip-tracking":
        return (
          <IPTrackingSection
            submissions={loginSessions}
            loading={loading}
            onRefresh={fetchLoginSessions}
            onBlockIP={handleBlockIP}
          />
        );
      case "rate-limiting":
        return (
          <RateLimitingSection
            rateLimits={rateLimits}
            onSaveRateLimits={handleSaveRateLimits}
            loading={loading}
          />
        );
      case "blocked-ips":
        return (
          <BlockedIPsSection
            blockedIPs={blockedIPs}
            loading={loading}
            onBlockIP={handleBlockIP}
            onUnblockIP={handleUnblockIP}
            onAddBlockedIP={handleAddBlockedIP}
          />
        );
      case "audit":
        return (
          <AuditLogsSection
            auditLogs={auditLogs}
            loading={loading}
            onRefresh={fetchAuditLogs}
          />
        );
      case "settings":
        return (
          <SettingsSection
            settings={settings}
            onSaveSettings={handleSaveSettings}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <SuperAdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main
        className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-0"
        }`}
      >
        <div className="p-6 lg:p-8">{renderSection()}</div>
      </main>

      {/* Modals */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={handleSaveUser}
        departments={departments}
      />

      <DepartmentModal
        isOpen={departmentModalOpen}
        onClose={() => {
          setDepartmentModalOpen(false);
          setSelectedDepartment(null);
        }}
        department={selectedDepartment}
        onSave={handleSaveDepartment}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedUser(null);
          setSelectedDepartment(null);
        }}
        onConfirm={
          confirmAction === "deleteUser"
            ? handleDeleteUser
            : handleDeleteDepartment
        }
        title={
          confirmAction === "deleteUser" ? "Delete User" : "Delete Department"
        }
        message={
          confirmAction === "deleteUser"
            ? `Are you sure you want to delete "${
                selectedUser?.full_name || selectedUser?.email
              }"? This action cannot be undone.`
            : `Are you sure you want to delete "${selectedDepartment?.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        confirmVariant="danger"
      />

      {/* Password Change Modal - Multi-step */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePasswordModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Step 1: Enter Password */}
            {passwordStep === 1 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-500 to-amber-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Shield size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      Reset Password
                    </h2>
                  </div>
                  <button
                    onClick={closePasswordModal}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle
                      size={20}
                      className="text-blue-600 flex-shrink-0"
                    />
                    <p className="text-sm text-blue-700">
                      A password reset link will be sent to the user's email
                      address.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">User Email</p>
                    <p className="font-medium text-gray-900">
                      {selectedUser?.email}
                    </p>
                  </div>

                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {passwordError}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closePasswordModal}
                      className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setPasswordStep(2)}
                      className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Confirm */}
            {passwordStep === 2 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      Confirm Action
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} className="text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Are you absolutely sure?
                    </h3>
                    <p className="text-gray-600">
                      This will send a password reset email to:
                    </p>
                    <p className="font-semibold text-maroon-800 mt-1">
                      {selectedUser?.email}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Warning:</strong> The user will receive an email
                      with a link to reset their password. Their current
                      password will remain active until they complete the reset
                      process.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setPasswordStep(1)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleConfirmPasswordChange}
                      disabled={passwordLoading}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {passwordLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Sending...
                        </>
                      ) : (
                        "Yes, Send Reset Email"
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {passwordStep === 3 && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      Success!
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Password Reset Email Sent!
                    </h3>
                    <p className="text-gray-600">
                      A password reset link has been sent to:
                    </p>
                    <p className="font-semibold text-maroon-800 mt-1">
                      {selectedUser?.email}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      The user should check their email inbox (and spam folder)
                      for the password reset link. The link will expire after 24
                      hours.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="w-full px-4 py-2.5 bg-maroon-800 text-white rounded-lg hover:bg-maroon-900 transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
