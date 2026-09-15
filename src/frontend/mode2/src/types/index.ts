// ── Re-export API types so the rest of the app can import from @/types ─────
export type {
  SubmissionRecord,
  GapRecord,
  ModuleScore,
  SubmissionReport,
  RequirementResult,
  EvidenceDocument,
  EvidenceStats,
  EvidenceResponse,
  UploadResult,
  Recommendation,
  ApiRequirement,
  CreateSubmissionInput,
} from '@/lib/api';

// ── Legacy UI-layer types (kept for backward compatibility) ─────────────────

/** @deprecated Use SubmissionRecord from @/lib/api */
export type Submission = {
  id: string;
  product: string;
  sponsor: string;
  region: string;
  type: string;
  targetDate: string;
  status: 'In review' | 'Processing' | 'Ready to submit' | 'Draft';
  progress: number;
  readiness: number;
  updatedAt: string;
  criticalGaps: number;
};

export type CTDModule = {
  id: string;
  name: string;
  shortName: string;
  score: number;
  status: 'Ready' | 'Attention' | 'Not started';
  sections: number;
  completed: number;
  attentionCount: number;
};

export type Gap = {
  id: string;
  module: string;
  section: string;
  title: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  owner: string;
  dueDate: string;
  status: 'Open' | 'In progress' | 'Resolved';
};

export type Evidence = {
  id: string;
  fileName: string;
  module: string;
  section: string;
  type: string;
  uploadedAt: string;
  status: 'Mapped' | 'Needs review' | 'Unmapped';
};

export type Report = {
  id: string;
  name: string;
  submissionId: string;
  createdAt: string;
  format: 'PDF' | 'DOCX';
  status: 'Ready' | 'Generating';
};
