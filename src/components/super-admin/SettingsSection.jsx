import { useState } from "react";
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Database,
  Lock,
  Globe,
  Save,
  RefreshCw,
} from "lucide-react";

const SettingCard = ({ icon: Icon, title, description, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const ToggleSetting = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div>
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-maroon-800" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

const SettingsSection = ({ settings, onSaveSettings, loading }) => {
  const [localSettings, setLocalSettings] = useState({
    emailNotifications: settings?.emailNotifications ?? true,
    auditLogging: settings?.auditLogging ?? true,
    twoFactorAuth: settings?.twoFactorAuth ?? false,
    maintenanceMode: settings?.maintenanceMode ?? false,
    publicRegistration: settings?.publicRegistration ?? true,
    autoBackup: settings?.autoBackup ?? true,
    allowGuestLogin: settings?.allowGuestLogin ?? true,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings(localSettings);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure system preferences and security</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-maroon-800 text-white rounded-lg hover:bg-maroon-900 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <SettingCard
          icon={Bell}
          title="Notifications"
          description="Configure notification preferences"
        >
          <div className="space-y-1">
            <ToggleSetting
              label="Email Notifications"
              description="Receive email alerts for important events"
              enabled={localSettings.emailNotifications}
              onChange={(v) => updateSetting("emailNotifications", v)}
            />
          </div>
        </SettingCard>

        {/* Security */}
        <SettingCard
          icon={Shield}
          title="Security"
          description="Manage security settings"
        >
          <div className="space-y-1">
            <ToggleSetting
              label="Two-Factor Authentication"
              description="Require 2FA for admin accounts"
              enabled={localSettings.twoFactorAuth}
              onChange={(v) => updateSetting("twoFactorAuth", v)}
            />
            <ToggleSetting
              label="Audit Logging"
              description="Log all system activities"
              enabled={localSettings.auditLogging}
              onChange={(v) => updateSetting("auditLogging", v)}
            />
          </div>
        </SettingCard>

        {/* System */}
        <SettingCard
          icon={Database}
          title="System"
          description="System-wide configuration"
        >
          <div className="space-y-1">
            <ToggleSetting
              label="Maintenance Mode"
              description="Put the system in maintenance mode"
              enabled={localSettings.maintenanceMode}
              onChange={(v) => updateSetting("maintenanceMode", v)}
            />
            <ToggleSetting
              label="Auto Backup"
              description="Automatically backup data daily"
              enabled={localSettings.autoBackup}
              onChange={(v) => updateSetting("autoBackup", v)}
            />
          </div>
        </SettingCard>

        {/* Access */}
        <SettingCard
          icon={Globe}
          title="Access Control"
          description="Control user access settings"
        >
          <div className="space-y-1">
            <ToggleSetting
              label="Public Registration"
              description="Allow public user registration"
              enabled={localSettings.publicRegistration}
              onChange={(v) => updateSetting("publicRegistration", v)}
            />
            <ToggleSetting
              label="Allow Guest Login"
              description="Allow students to login as guests without Google Auth"
              enabled={localSettings.allowGuestLogin}
              onChange={(v) => updateSetting("allowGuestLogin", v)}
            />
          </div>
        </SettingCard>
      </div>
    </div>
  );
};

export default SettingsSection;
