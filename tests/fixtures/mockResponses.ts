export const mockLeadBuilderResponse = {
  understanding: {
    intent: 'Suche nach Tech-Leads in Berlin',
    entities: ['Branche: Tech', 'Standort: Berlin', 'Unternehmensgröße: 50-200'],
    confidence: 0.92,
  },
  matches: {
    count: 147,
    preview: [
      { id: 'lead-1', name: 'TechStart GmbH', score: 0.95 },
      { id: 'lead-2', name: 'InnovateTech AG', score: 0.88 },
      { id: 'lead-3', name: 'Berlin Digital Solutions', score: 0.85 },
      { id: 'lead-4', name: 'CloudFirst Berlin', score: 0.82 },
      { id: 'lead-5', name: 'DataDriven Tech', score: 0.79 },
    ],
  },
  artifacts: {
    query: 'SELECT * FROM leads WHERE industry = "tech" AND location = "Berlin" AND size BETWEEN 50 AND 200',
    filters: {
      industry: 'tech',
      location: 'Berlin',
      size: { min: 50, max: 200 },
    },
  },
};

export const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Tech Leads Berlin',
    query: 'Tech-Unternehmen in Berlin mit 50-200 Mitarbeitern',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'tpl-2',
    name: 'E-Commerce DACH',
    query: 'E-Commerce Unternehmen in DACH Region',
    createdAt: new Date('2024-01-10'),
  },
];
