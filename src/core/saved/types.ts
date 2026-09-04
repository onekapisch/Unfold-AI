export interface SavedInsightInput {
  providerId: string;
  conversationUrl: string;
  pageTitle: string;
  sectionTitle: string;
  text: string;
  note: string;
}

export interface SavedInsight extends SavedInsightInput {
  id: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}

export interface SavedInsightsBackup {
  schemaVersion: 1;
  exportedAt: number;
  insights: SavedInsight[];
}
