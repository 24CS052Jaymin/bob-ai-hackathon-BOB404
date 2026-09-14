import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Filter, Search, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { Card, PageHeader, StatusBadge } from '@/components/common';
import { evidence } from '@/data/mock-data';

export function EvidencePage() {
  const [query, setQuery] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const filtered = evidence.filter((item) =>
    `${item.fileName} ${item.module} ${item.section}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <Link
        href="/submissions/sub-2408"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        data-testid="link-back-evidence"
      >
        <ArrowLeft className="h-4 w-4" /> Lumineximab overview
      </Link>
      <PageHeader
        eyebrow="Evidence graph"
        title="Evidence & documents"
        description="Map every source document to the CTD sections it supports."
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:-translate-y-0.5">
            <input type="file" className="sr-only" onChange={() => setUploaded(true)} data-testid="input-upload-evidence" />
            <UploadCloud className="h-4 w-4" /> Upload evidence
          </label>
        }
      />

      {uploaded && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#cce9dd] bg-[#f0faf5] p-3 text-xs font-semibold text-[#43896e]">
          <CheckCircle2 className="h-4 w-4" /> Evidence uploaded and queued for mapping.
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 text-xs outline-none focus:border-primary"
              placeholder="Search files or CTD sections..."
              aria-label="Search evidence"
              data-testid="input-search-evidence"
            />
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted"
            data-testid="button-evidence-filter"
          >
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
        <div className="hidden grid-cols-[1.6fr_0.65fr_0.65fr_0.8fr_0.7fr_24px] gap-4 bg-[#fbfdfc] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
          <span>Document</span>
          <span>Module</span>
          <span>Section</span>
          <span>Type</span>
          <span>Status</span>
          <span />
        </div>
        <div className="divide-y divide-border/70">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 px-5 py-4 hover:bg-[#f8fcfb] md:grid-cols-[1.6fr_0.65fr_0.65fr_0.8fr_0.7fr_24px] md:items-center md:gap-4"
              data-testid={`row-evidence-${item.id}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf7f6] text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{item.fileName}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Uploaded {item.uploadedAt}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{item.module}</span>
              <span className="text-xs font-semibold">{item.section}</span>
              <span className="text-xs text-muted-foreground">{item.type}</span>
              <span>
                <StatusBadge>{item.status}</StatusBadge>
              </span>
              <button
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label={`Open ${item.fileName}`}
                data-testid={`button-open-evidence-${item.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
