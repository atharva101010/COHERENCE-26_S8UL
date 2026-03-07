import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Sparkles, Mail, User, Building2, Loader2, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AIPreviewModal({ isOpen, onClose, nodeData }) {
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const fetchPreviews = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/ai/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: nodeData.prompt || 'Write a personalized outreach email to {{name}} at {{company}}.',
          tone: nodeData.tone || 'professional',
          maxLength: nodeData.maxLength || 200,
          credentialId: nodeData.credentialId || null,
          model: nodeData.model || null,
          companyName: nodeData.companyName || '',
          senderName: nodeData.senderName || '',
          industry: nodeData.industry || '',
          painPoints: nodeData.painPoints || '',
          callToAction: nodeData.callToAction || '',
          signature: nodeData.signature || '',
          language: nodeData.language || 'English',
          messageType: nodeData.messageType || 'outreach_email',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate previews');
      }

      const data = await res.json();
      setPreviews(data.previews || []);
      setSource(data.source || 'mock');
    } catch (err) {
      setError(err.message);
      toast.error('Failed to generate previews');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on first open
  if (previews.length === 0 && !loading && !error) {
    fetchPreviews();
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">AI Message Preview</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {source === 'mock' ? 'Using mock data (no API key set)' : 'Generated via Groq AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPreviews}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Prompt Info */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Tone: <strong className="text-zinc-800 dark:text-zinc-200">{nodeData.tone || 'professional'}</strong>
            </span>
            <span>
              Max: <strong className="text-zinc-800 dark:text-zinc-200">{nodeData.maxLength || 200}</strong> words
            </span>
            {nodeData.companyName && (
              <span>
                Company: <strong className="text-zinc-800 dark:text-zinc-200">{nodeData.companyName}</strong>
              </span>
            )}
            {nodeData.senderName && (
              <span>
                From: <strong className="text-zinc-800 dark:text-zinc-200">{nodeData.senderName}</strong>
              </span>
            )}
            {nodeData.industry && (
              <span>
                Industry: <strong className="text-zinc-800 dark:text-zinc-200">{nodeData.industry}</strong>
              </span>
            )}
            {nodeData.messageType && (
              <span>
                Type: <strong className="text-zinc-800 dark:text-zinc-200">{nodeData.messageType.replaceAll('_', ' ')}</strong>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
            Prompt: <span className="text-zinc-700 dark:text-zinc-300">{nodeData.prompt || 'No prompt set'}</span>
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-500" />
              <p className="text-sm font-medium">Generating personalized messages...</p>
              <p className="text-xs mt-1">This may take a few seconds</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={fetchPreviews}
                className="mt-3 px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && previews.map((preview) => (
            <div key={preview.id} className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              {/* Lead info bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-zinc-50 to-zinc-100 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{preview.lead?.name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{preview.lead?.email || ''}</span>
                      {preview.lead?.company && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Building2 className="w-3 h-3" />
                            {preview.lead.company}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(`Subject: ${preview.subject}\n\n${preview.body}`, preview.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-900/30 rounded-md transition-colors"
                >
                  {copiedId === preview.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === preview.id ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Email content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{preview.subject}</span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed pl-6">
                  {preview.body}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3 text-xs text-zinc-400">
                <span className={`px-2 py-0.5 rounded-full ${preview.source === 'groq' ? 'bg-violet-100 text-violet-700 dark:text-violet-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                  {preview.source === 'groq' ? `Groq • ${preview.model || 'llama-3.3-70b'}` : 'Mock Data'}
                </span>
                <span>Tone: {preview.tone}</span>
              </div>
            </div>
          ))}

          {!loading && !error && previews.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No previews generated yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            {previews.length} preview{previews.length === 1 ? '' : 's'} generated
            {source === 'mock' && ' • Add a Groq API key in Settings for real AI generation'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 hover:bg-zinc-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

AIPreviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  nodeData: PropTypes.shape({
    prompt: PropTypes.string,
    tone: PropTypes.string,
    maxLength: PropTypes.number,
    credentialId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    model: PropTypes.string,
    companyName: PropTypes.string,
    senderName: PropTypes.string,
    industry: PropTypes.string,
    painPoints: PropTypes.string,
    callToAction: PropTypes.string,
    signature: PropTypes.string,
    language: PropTypes.string,
    messageType: PropTypes.string,
  }).isRequired,
};
