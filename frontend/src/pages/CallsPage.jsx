import { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOutgoing, Play, Users, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { autoCallLeads, fetchCallHistory, fetchCallStats } from '../lib/supabaseService';

export default function CallsPage() {
  const [stats, setStats] = useState({ totalCalls: 0, sentCalls: 0, totalLeads: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [callResults, setCallResults] = useState(null);
  const [callLimit, setCallLimit] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([fetchCallStats(), fetchCallHistory()]);
      setStats(s);
      setHistory(h);
    } catch (err) {
      console.error('Failed to load call data:', err);
    }
    setLoading(false);
  }

  async function handleAutoCall() {
    setCalling(true);
    setCallResults(null);
    try {
      const result = await autoCallLeads({ limit: callLimit });
      setCallResults(result);
      await loadData();
    } catch (err) {
      console.error('Auto-call failed:', err);
    }
    setCalling(false);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-indigo-600" />
            Auto Calls
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Automatically call leads with AI-generated scripts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Phone className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.totalCalls}</p>
              <p className="text-xs text-zinc-500">Total Calls Made</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.sentCalls}</p>
              <p className="text-xs text-zinc-500">Successful Calls</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.totalLeads}</p>
              <p className="text-xs text-zinc-500">Total Leads Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Call Panel */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <PhoneOutgoing className="w-5 h-5 text-indigo-600" />
            Trigger Auto-Call
          </h2>
          <p className="text-sm text-zinc-500 mt-1">AI generates a personalized call script for each lead automatically</p>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-700">Call up to</label>
            <select
              value={callLimit}
              onChange={(e) => setCallLimit(Number(e.target.value))}
              className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={3}>3 leads</option>
              <option value={5}>5 leads</option>
              <option value={10}>10 leads</option>
              <option value={20}>20 leads</option>
            </select>
          </div>
          <button
            onClick={handleAutoCall}
            disabled={calling}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {calling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Auto-Call
              </>
            )}
          </button>
        </div>

        {/* Call Results */}
        {callResults && (
          <div className="border-t border-zinc-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold text-green-700">{callResults.message}</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {callResults.calls?.map((call, i) => (
                <div key={i} className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium text-zinc-900 text-sm">{call.name}</span>
                      <span className="text-xs text-zinc-400">•</span>
                      <span className="text-xs text-zinc-500">{call.company}</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{call.status}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-1">📞 {call.phone}</p>
                  <p className="text-sm text-zinc-600 leading-relaxed italic">&quot;{call.script}&quot;</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Call History */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-500" />
            Call History
          </h2>
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-10 text-center text-zinc-400 text-sm">
            No calls yet. Click &quot;Start Auto-Call&quot; to begin!
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {history.map((record) => (
              <div key={record.id} className="p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                      <Phone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {record.leads?.name || 'Unknown'}
                        <span className="text-zinc-400 font-normal ml-2">{record.leads?.company}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{record.body?.substring(0, 100)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      record.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{record.status}</span>
                    <span className="text-xs text-zinc-400">{new Date(record.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
