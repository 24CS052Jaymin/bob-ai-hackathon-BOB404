import { CheckCircle2, FileText, LibraryBig, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { DragEvent, useRef, useState } from 'react';
import { Card, PageHeader } from '@/components/common';

const API_URL = import.meta.env.VITE_OFFICIAL_EVIDENCE_API_URL ?? 'http://localhost:8000';

export function OfficialCtdPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const addFiles = (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (accepted.length !== Array.from(incoming).length) setError('Only PDF files can be added to the official CTD library.');
    setFiles((current) => [...current, ...accepted.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size))]);
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };
  const upload = async () => {
    if (!files.length) return;
    setIsUploading(true); setError(undefined); setMessage(undefined);
    try {
      const payload = new FormData();
      files.forEach((file) => payload.append('files', file));
      const response = await fetch(`${API_URL}/api/official-evidence/documents`, { method: 'POST', body: payload });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? 'The official PDFs could not be uploaded.');
      setMessage(`${files.length} official PDF${files.length === 1 ? '' : 's'} queued for evidence ingestion.`);
      setFiles([]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The upload failed.');
    } finally { setIsUploading(false); }
  };

  return <div className="mx-auto max-w-[920px]">
    <PageHeader eyebrow="Regulatory knowledge base" title="Official CTD library" description="Upload ICH, FDA, and other official regulatory PDFs. These sources are kept separate from applicant dossier submissions." />
    <Card className="mt-7 p-6 md:p-8">
      <div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e3f5f1] text-primary"><LibraryBig className="h-5 w-5" /></div><div><h2 className="font-display text-lg font-extrabold">Add official source documents</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Each PDF is hash-versioned and ingested into the official evidence collection. It will never be treated as a user submission.</p></div></div>
      <label onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} className={`mt-6 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-colors ${isDragging ? 'border-primary bg-[#eaf8f6]' : 'border-primary/50 bg-[#f4fbfa] hover:bg-[#edf9f7]'}`}>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={(event) => event.target.files && addFiles(event.target.files)} data-testid="input-official-ctd-files" />
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff4f0] text-primary"><UploadCloud className="h-6 w-6" /></div><p className="mt-4 text-sm font-bold">Drop official PDFs here or browse</p><p className="mt-1 text-xs text-muted-foreground">PDF only — ICH, FDA, and other official guidance</p>
      </label>
      {files.length > 0 && <div className="mt-5 space-y-2">{files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs"><FileText className="h-4 w-4 text-primary" /><span className="flex-1 truncate font-semibold">{file.name}</span><span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</span><button onClick={() => setFiles((current) => current.filter((item) => item !== file))} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button></div>)}</div>}
      {error && <p className="mt-4 rounded-xl bg-[#fce9e5] px-4 py-3 text-xs font-semibold text-[#b45148]" role="alert">{error}</p>}
      {message && <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#e4f6ee] px-4 py-3 text-xs font-semibold text-[#398969]"><CheckCircle2 className="h-4 w-4" />{message}</p>}
      <div className="mt-6 flex justify-end border-t border-border/70 pt-5"><button disabled={!files.length || isUploading} onClick={upload} className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-xs font-bold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-upload-official-ctd">{isUploading && <LoaderCircle className="h-4 w-4 animate-spin" />}{isUploading ? 'Uploading…' : 'Upload to official library'}</button></div>
    </Card>
  </div>;
}
