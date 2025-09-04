export interface Document {
  type: string;
  title: string;
  content: string;
  order: number;
  description?: string;
}

export interface DocumentViewerProps {
  sessionId: string;
  externalId: string;
  sessionName?: string;
}

export const documentTypes = [
  { type: 'prd', title: 'Product Requirements', icon: '📋' },
  { type: 'frontend', title: 'Frontend Architecture', icon: '🎨' },
  { type: 'backend', title: 'Backend Architecture', icon: '⚙️' },
  { type: 'state_management', title: 'State Management', icon: '🔄' },
  { type: 'database_schema', title: 'Database Schema', icon: '🗄️' },
  { type: 'api', title: 'API Specifications', icon: '🔌' },
  { type: 'devops', title: 'DevOps & Deployment', icon: '🚀' },
  { type: 'testing_plan', title: 'Testing Strategy', icon: '🧪' },
  { type: 'code_documentation', title: 'Documentation Standards', icon: '📚' },
  { type: 'performance_optimization', title: 'Performance Optimization', icon: '⚡' },
  { type: 'user_flow', title: 'User Flow Diagrams', icon: '🔀' },
  { type: 'third_party_libraries', title: 'Third-Party Libraries', icon: '📦' },
  { type: 'readme', title: 'README', icon: '📝' }
];