import { useState, useEffect, useRef } from 'react';
import { Camera, Save, User, Mail, Phone, Building2, Briefcase, Globe, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland',
];

export default function Profile() {
  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', company: '',
    job_title: '', bio: '', avatar_url: '', timezone: 'UTC', plan: 'Free',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/profile`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      const updated = await res.json();
      setProfile(updated);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          filename: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
          contentType: file.type,
        }),
      });
      if (!res.ok) throw new Error('Failed to upload avatar');
      const data = await res.json();
      setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const initials = (profile.full_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your personal information and preferences</p>
      </div>

      {/* Avatar Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-zinc-200 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                <span className="text-white text-2xl font-bold">{initials}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading
                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                : <Camera className="w-6 h-6 text-white" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{profile.full_name || 'Your Name'}</h2>
            <p className="text-sm text-zinc-500">{profile.job_title || 'Job Title'} {profile.company ? `at ${profile.company}` : ''}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                <CheckCircle2 className="w-3 h-3" />
                {profile.plan || 'Free'} Plan
              </span>
              {profile.timezone && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                  <Globe className="w-3 h-3" />
                  {profile.timezone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="text-base font-semibold text-zinc-900">Personal Information</h3>
          <p className="text-sm text-zinc-500 mt-0.5">Update your personal details</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" /> Full Name
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400" /> Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Phone & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Company
              </label>
              <input
                type="text"
                value={profile.company}
                onChange={e => handleChange('company', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {/* Job Title & Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" /> Job Title
              </label>
              <input
                type="text"
                value={profile.job_title}
                onChange={e => handleChange('job_title', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                placeholder="Product Manager"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-zinc-400" /> Timezone
              </label>
              <select
                value={profile.timezone}
                onChange={e => handleChange('timezone', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all bg-white"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" /> Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={e => handleChange('bio', e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all resize-none"
              placeholder="Tell us a bit about yourself..."
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={fetchProfile}
            className="px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-medium text-zinc-500 mb-1">Plan</p>
            <p className="text-sm font-semibold text-indigo-600">{profile.plan || 'Free'}</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-medium text-zinc-500 mb-1">Member Since</p>
            <p className="text-sm font-semibold text-zinc-900">
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-medium text-zinc-500 mb-1">Last Updated</p>
            <p className="text-sm font-semibold text-zinc-900">
              {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
