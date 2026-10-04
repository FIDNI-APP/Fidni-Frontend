// Signalements d'erreurs sur les contenus (backend : apps/things/reports.py).
import { api } from './apiClient';

export type ReportReason = 'statement' | 'solution' | 'scale' | 'typo' | 'display' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ReportPayload {
  reason: ReportReason;
  item_path?: string;
  item_label?: string;
  description?: string;
}

export interface ContentReportRow {
  id: number;
  reason: ReportReason;
  reason_label: string;
  item_path: string;
  item_label: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  handled_at: string | null;
  handled_by: string | null;
  user: string | null;
  content: { id: number; type: string; title: string; url: string };
}

export const reportContent = async (contentId: number | string, payload: ReportPayload) =>
  (await api.post(`/contents/${contentId}/report/`, payload)).data as { id: number; duplicate: boolean };

export const listReports = async (statut: ReportStatus | 'all' = 'open') =>
  (await api.get('/pilotage/signalements/', { params: { statut } })).data as {
    counts: Record<ReportStatus, number>;
    results: ContentReportRow[];
  };

export const updateReport = async (id: number, status: ReportStatus) =>
  (await api.patch(`/pilotage/signalements/${id}/`, { status })).data as ContentReportRow;
