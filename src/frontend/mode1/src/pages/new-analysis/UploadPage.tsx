import { ArrowRight, ChevronDown, ChevronRight, FolderOpen, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Button, PageHeader } from '@/components/common';
import { useApp } from '@/context/AppProvider';

export function UploadPage() {
  const { notify } = useApp();
  const [file, setFile] = useState('');
  const [source, setSource] = useState('FAERS quarterly export');
  const [advanced, setAdvanced] = useState(false);

  return (
    <div className="mx-auto max-w-4xl animate-enter">
      <PageHeader
        eyebrow="New analysis / 1 of 3"
        title="Bring in a data source"
        description="Start with a FAERS-style report file. ReguLens will validate the structure before statistical screening."
      />

      <div className="mb-6 flex items-center gap-2 text-[11px] font-bold text-teal-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">1</span>
        <span>Upload</span>
        <span className="mx-2 h-px w-10 bg-teal-200" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-teal-700">2</span>
        <span className="text-slate-400">Validate</span>
        <span className="mx-2 h-px w-10 bg-slate-200" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">3</span>
        <span className="text-slate-400">Configure</span>
      </div>

      <div className="surface p-6 md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Upload size={21} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Analysis data</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              CSV or ZIP up to 2 GB. We recommend the standard FAERS quarterly format.
            </p>
          </div>
        </div>

        <label
          htmlFor="upload-file"
          className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/35 px-6 text-center transition hover:border-teal-400 hover:bg-teal-50"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-teal-600 shadow-sm">
            <FolderOpen size={22} />
          </div>
          <div className="text-sm font-bold text-slate-700">{file || 'Choose a report file'}</div>
          <div className="mt-1 text-xs text-slate-400">or drag and drop here</div>
          <input
            data-testid="input-upload-file"
            id="upload-file"
            type="file"
            accept=".csv,.zip"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0]?.name;
              if (picked) {
                setFile(picked);
                notify('File attached for validation');
              }
            }}
          />
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            Data source name
            <input
              data-testid="input-source-name"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium outline-none focus:border-teal-400"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Report type
            <select
              data-testid="select-report-type"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium outline-none focus:border-teal-400"
            >
              <option>FAERS quarterly export</option>
              <option>Custom safety database</option>
              <option>Literature review extract</option>
            </select>
          </label>
        </div>

        <button
          data-testid="button-toggle-advanced-upload"
          onClick={() => setAdvanced((v) => !v)}
          className="mt-5 flex items-center gap-2 text-xs font-bold text-teal-700"
        >
          {advanced ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Advanced source options
        </button>
        {advanced && (
          <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Preserve report IDs
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Normalize MedDRA terms
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" /> Include null reports
            </label>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-2">
          <Button testId="button-cancel-upload" variant="ghost" onClick={() => window.history.pushState({}, '', '/safety')}>
            Cancel
          </Button>
          <Link
            href="/safety/upload/validation"
            data-testid="link-continue-validation"
            onClick={() => notify(`${source} is ready for validation`)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700"
          >
            Continue to validation <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
