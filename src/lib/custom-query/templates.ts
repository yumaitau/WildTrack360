// Prebuilt query templates surfaced in the workbench template dropdown.
// Each query is valid against CUSTOM_QUERY_SOURCES.

export interface PrebuiltCustomQuery {
  id: string;
  label: string;
  description: string;
  query: string;
}

export const PREBUILT_CUSTOM_QUERIES: readonly PrebuiltCustomQuery[] = [
  {
    id: 'incidents-by-severity',
    label: 'Incidents by severity',
    description: 'Incident counts grouped by severity.',
    query: 'count from incidents group by severity chart bar',
  },
  {
    id: 'open-incidents',
    label: 'Open (unresolved) incidents',
    description: 'Unresolved incidents grouped by type.',
    query: 'count from incidents where resolved = false group by type chart table',
  },
  {
    id: 'animals-by-status',
    label: 'Animals by status',
    description: 'Current animals grouped by care status.',
    query: 'count from animals group by status chart pie',
  },
  {
    id: 'animals-by-species',
    label: 'Top species in care',
    description: 'Animal counts by species (top 10).',
    query: 'count from animals group by species limit 10 chart bar',
  },
  {
    id: 'intake-trend',
    label: 'Animal intake trend',
    description: 'Animals admitted per month, split by species.',
    query: 'count from animals group by species trend by foundMonth chart line',
  },
  {
    id: 'training-hours-by-type',
    label: 'Training hours by type',
    description: 'Total carer training hours grouped by training type.',
    query: 'sum trainingHours from carer_training group by trainingType chart bar',
  },
  {
    id: 'training-hours-trend',
    label: 'Training hours trend',
    description: 'Carer training hours over time, split by training type.',
    query:
      'sum trainingHours from carer_training group by trainingType trend by completedMonth chart line',
  },
  {
    id: 'hygiene-completion',
    label: 'Hygiene log completion',
    description: 'Hygiene checks grouped by completion status.',
    query: 'count from hygiene_logs group by completed chart pie',
  },
  {
    id: 'releases-by-type',
    label: 'Releases by type',
    description: 'Release checklists grouped by release type.',
    query: 'count from release_checklists group by releaseType chart bar',
  },
  {
    id: 'care-records-trend',
    label: 'Care activity trend',
    description: 'Care log entries per month, split by record type.',
    query: 'count from records group by type trend by recordedMonth chart line',
  },
] as const;
