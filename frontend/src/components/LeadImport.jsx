import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkImportLeads, uploadFile, getCurrentUserId } from '../lib/supabaseService';

const REQUIRED_FIELDS = ['name', 'email'];
const OPTIONAL_FIELDS = ['company', 'title', 'source'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export default function LeadImport({ onImportComplete }) { // eslint-disable-line react/prop-types
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = useCallback(async (selectedFile) => {
    const buffer = await selectedFile.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (jsonData.length === 0) {
      toast.error('File is empty or has no data rows');
      return;
    }

    const fileHeaders = Object.keys(jsonData[0]);
    setRawData(jsonData);
    setHeaders(fileHeaders);
    setFile(selectedFile);

    // Auto-map columns by matching header names
    const autoMapping = {};
    for (const field of ALL_FIELDS) {
      const match = fileHeaders.find(
        (h) => h.toLowerCase().replaceAll(/[_\s-]/g, '') === field.toLowerCase()
      );
      if (match) autoMapping[field] = match;
    }
    setMapping(autoMapping);
    setStep(2);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) parseFile(dropped);
  }, [parseFile]);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files[0];
    if (selected) parseFile(selected);
  }, [parseFile]);

  const handleMappingChange = (field, header) => {
    setMapping((prev) => ({ ...prev, [field]: header || undefined }));
  };

  const goToPreview = () => {
    if (!mapping.name || !mapping.email) {
      toast.error('Name and Email mappings are required');
      return;
    }

    const mapped = rawData.map((row) => {
      const lead = {};
      for (const [field, header] of Object.entries(mapping)) {
        if (header) lead[field] = row[header];
      }
      return lead;
    });

    setPreview(mapped);
    setStep(3);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      // Upload original file to Supabase Storage
      if (file) {
        const userId = await getCurrentUserId();
        const ext = file.name.split('.').pop();
        const uuid = crypto.randomUUID();
        const storagePath = `${userId || 'anonymous'}/imports/${uuid}.${ext}`;
        try {
          await uploadFile(storagePath, file);
        } catch (uploadErr) {
          console.warn('File upload to storage failed, continuing with import:', uploadErr.message);
        }
      }

      const response = await bulkImportLeads(preview);
      const { imported, skipped, total } = response;
      const skippedMsg = skipped > 0 ? ` (${skipped} skipped)` : '';
      toast.success(`Imported ${imported} of ${total} leads${skippedMsg}`);
      onImportComplete?.();
      setStep(1);
      setFile(null);
      setRawData([]);
      setHeaders([]);
      setMapping({});
      setPreview([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setPreview([]);
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: 'Upload File' },
          { num: 2, label: 'Map Columns' },
          { num: 3, label: 'Preview & Import' },
        ].map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${(() => {
                if (step > num) return 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md shadow-green-200';
                if (step === num) return 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200';
                return 'bg-zinc-100 text-zinc-400';
              })()}`}
            >
              {step > num ? <Check className="w-4 h-4" /> : num}
            </div>
            <span className={`text-sm transition-colors ${
              step >= num ? 'text-zinc-900 font-medium' : 'text-zinc-400'
            }`}>
              {label}
            </span>
            {i < 2 && (
              <div className={`w-12 h-0.5 mx-2 rounded-full transition-colors ${
                step > num ? 'bg-emerald-400' : 'bg-zinc-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`block border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]'
              : 'border-zinc-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20'
          }`}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Upload className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            Drop your CSV or Excel file here
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            Supports .csv, .xlsx, and .xls files
          </p>
          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300">
            <FileSpreadsheet className="w-4 h-4" />
            Browse Files
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Map Columns</h3>
              <p className="text-sm text-zinc-500">
                Match your file columns to lead fields. Found {rawData.length} rows in{' '}
                <span className="font-medium">{file?.name}</span>
              </p>
            </div>
            <button onClick={reset} className="text-sm text-zinc-500 hover:text-zinc-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-3">
            {ALL_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-zinc-700 capitalize flex items-center gap-1">
                  {field}
                  {REQUIRED_FIELDS.includes(field) && (
                    <span className="text-red-500">*</span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-zinc-200/60 rounded-xl bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                >
                  <option value="">— Skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={goToPreview}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-200"
            >
              Preview Data
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Import */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Preview & Import</h3>
              <p className="text-sm text-zinc-500">
                Review {preview.length} leads before importing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600">
                Showing first {Math.min(preview.length, 10)} rows
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  {Object.keys(mapping).filter((k) => mapping[k]).map((field) => (
                    <th key={field} className="text-left py-2 px-3 text-zinc-600 font-medium capitalize">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row) => (
                  <tr key={row.email || row.name || JSON.stringify(row)} className="border-b border-zinc-100 hover:bg-zinc-50">
                    {Object.keys(mapping).filter((k) => mapping[k]).map((field) => (
                      <td key={field} className="py-2 px-3 text-zinc-800">
                        {row[field] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 transition-colors"
            >
              ← Back to Mapping
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200"
            >
              {importing ? 'Importing...' : `Import ${preview.length} Leads`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
