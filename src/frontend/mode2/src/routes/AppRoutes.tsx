import { Route, Switch } from 'wouter';
import {
  AnalysisPage,
  DashboardPage,
  EvidencePage,
  GapsPage,
  HistoryPage,
  ModulesPage,
  NewSubmissionPage,
  NotFoundPage,
  ReportsPage,
  RequirementsPage,
  SettingsPage,
  SubmissionOverviewPage,
  SubmissionsPage,
} from '@/pages';

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/submissions/new" component={NewSubmissionPage} />
      <Route path="/submissions/:id/analysis" component={AnalysisPage} />
      <Route path="/submissions/:id/modules" component={ModulesPage} />
      <Route path="/submissions/:id/gaps" component={GapsPage} />
      <Route path="/submissions/:id/evidence" component={EvidencePage} />
      <Route path="/submissions" component={SubmissionsPage} />
      <Route path="/submissions/:id" component={SubmissionOverviewPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/requirements" component={RequirementsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
