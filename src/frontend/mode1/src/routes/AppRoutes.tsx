import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import {
  AnalysisPage,
  ClustersPage,
  ConfigurePage,
  DataExplorerPage,
  HistoryPage,
  NotFoundPage,
  OverviewPage,
  ReportsPage,
  ReviewPage,
  SettingsPage,
  SignalDetailPage,
  SignalsPage,
  UploadPage,
  ValidationPage,
} from '@/pages';

function RedirectToOverview() {
  const [, setLocation] = useLocation();
  useEffect(() => setLocation('/safety'), [setLocation]);
  return <div className="min-h-[70vh]" />;
}

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/">
        <RedirectToOverview />
      </Route>
      <Route path="/safety" component={OverviewPage} />
      <Route path="/safety/upload" component={UploadPage} />
      <Route path="/safety/upload/validation" component={ValidationPage} />
      <Route path="/safety/configure" component={ConfigurePage} />
      <Route path="/safety/analysis" component={AnalysisPage} />
      <Route path="/safety/signals" component={SignalsPage} />
      <Route path="/safety/signals/:id" component={SignalDetailPage} />
      <Route path="/safety/clusters" component={ClustersPage} />
      <Route path="/safety/review" component={ReviewPage} />
      <Route path="/safety/reports" component={ReportsPage} />
      <Route path="/safety/data" component={DataExplorerPage} />
      <Route path="/safety/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
