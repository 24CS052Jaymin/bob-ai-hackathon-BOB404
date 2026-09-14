export type Trend = 'Rising' | 'Stable' | 'Declining';
export type Priority = 'High' | 'Medium' | 'Low';
export type SignalStatus = 'New' | 'In review' | 'Monitoring' | 'Closed';

export type Signal = {
  id: string;
  drug: string;
  event: string;
  reports: number;
  prr: number;
  confidenceInterval: string;
  trend: Trend;
  cluster: string;
  priority: Priority;
  status: SignalStatus;
  backgroundReports: number;
  monthlyReports: number[];
  reviewed: boolean;
};

export type Cluster = {
  id: string;
  name: string;
  eventCount: number;
  emerging: boolean;
  events: string[];
  drugs: string[];
};

export type FaersReport = {
  id: string;
  drug: string;
  event: string;
  age: number;
  sex: string;
  outcome: string;
  reportDate: string;
  reporterType: string;
};

export type AnalysisHistory = {
  id: string;
  dataset: string;
  reports: number;
  signals: number;
  highPriority: number;
  date: string;
  analyst: string;
  status: string;
};

export type ReviewItem = {
  id: string;
  signalId: string;
  drug: string;
  event: string;
  priority: Priority;
  assigned: string;
  due: string;
  note: string;
  reviewed: boolean;
};
