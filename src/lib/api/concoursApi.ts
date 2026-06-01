/**
 * Concours API client — exams (ENSA / ENSAM / Médecine), tips, simulations.
 */
import { api } from './apiClient';

const BASE = '/concours/';

export type ConcoursType = 'ensa' | 'ensam' | 'medecine';
export const CONCOURS_TYPES: { id: ConcoursType; label: string }[] = [
  { id: 'ensa',     label: 'ENSA' },
  { id: 'ensam',    label: 'ENSAM' },
  { id: 'medecine', label: 'Médecine' },
];

export type SimulationMode = 'exam' | 'random_year' | 'random_mix';

/* ─────────────── Exam ─────────────── */

export interface ConcoursQuestion {
  id: string;
  statement: string;
  options: { key: string; text: string }[];
  correct_key?: string;        // hidden during simulation
  explanation?: string;        // hidden during simulation
  subject_id?: number | null;
  subfield_id?: number | null;
  chapter_id?: number | null;
  tip_id?: number | null;
  points?: number;
}

export interface ConcoursStructure {
  version?: string;
  questions: ConcoursQuestion[];
}

export interface ConcoursExamListItem {
  id: number;
  display_id: number;
  concours_type: ConcoursType;
  concours_type_display: string;
  year: number;
  title: string;
  description: string;
  duration_minutes: number;
  question_count: number;
  is_saved: boolean;
  comment_count: number;
  created_at: string;
}

export interface ConcoursExam extends ConcoursExamListItem {
  raw_title?: string;
  structure: ConcoursStructure;
  created_by: { id: number; username: string; avatar?: string | null };
  updated_at: string;
}

export interface ListExamsParams {
  concours_type?: ConcoursType;
  year?: number;
  year_min?: number;
  year_max?: number;
}

export async function listConcoursExams(params: ListExamsParams = {}): Promise<ConcoursExamListItem[]> {
  const r = await api.get(`${BASE}exams/`, { params });
  return Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
}

export async function getConcoursExam(id: number | string, hideSolutions = false): Promise<ConcoursExam> {
  const r = await api.get(`${BASE}exams/${id}/`, {
    params: hideSolutions ? { hide_solutions: 1 } : undefined,
  });
  return r.data;
}

export async function createConcoursExam(payload: {
  concours_type: ConcoursType;
  year: number;
  title?: string;
  description?: string;
  duration_minutes?: number;
}): Promise<ConcoursExam> {
  const r = await api.post(`${BASE}exams/`, payload);
  return r.data;
}

export async function updateConcoursExam(
  id: number | string,
  payload: Partial<{
    concours_type: ConcoursType;
    year: number;
    title: string;
    description: string;
    duration_minutes: number;
  }>,
): Promise<ConcoursExam> {
  const r = await api.patch(`${BASE}exams/${id}/`, payload);
  return r.data;
}

export async function deleteConcoursExam(id: number | string): Promise<void> {
  await api.delete(`${BASE}exams/${id}/`);
}

export async function getConcoursStructure(id: number | string): Promise<ConcoursStructure> {
  const r = await api.get(`${BASE}exams/${id}/structure/`);
  return r.data;
}

export async function setConcoursStructure(id: number | string, structure: ConcoursStructure): Promise<void> {
  await api.put(`${BASE}exams/${id}/structure/`, structure);
}

export async function toggleSaveExam(id: number | string): Promise<{ is_saved: boolean }> {
  const r = await api.post(`${BASE}exams/${id}/save/`);
  return r.data;
}

/* ─────────────── Tip ─────────────── */

export interface ConcoursTip {
  id: number;
  title: string;
  description: string;
  concours_types: ConcoursType[];
  subject?: number | null;
  subject_id?: number | null;
  subject_name?: string | null;
  subfield?: number | null;
  subfield_id?: number | null;
  subfield_name?: string | null;
  chapters?: number[];
  chapter_ids?: number[];
  chapter_names?: string[];
  video_url?: string;
  video_file?: { id: string; url: string; file_name: string; mime_type: string; file_size: number; file_type: string } | null;
  view_count: number;
  is_saved: boolean;
  user_vote: number;
  vote_count: number;
  comment_count: number;
  created_by: { id: number; username: string; avatar?: string | null };
  created_at: string;
  updated_at: string;
}

export interface ListTipsParams {
  concours_type?: ConcoursType;
  subject?: number;
  subfield?: number;
  chapter?: number;
  search?: string;
}

export async function listConcoursTips(params: ListTipsParams = {}): Promise<ConcoursTip[]> {
  const r = await api.get(`${BASE}tips/`, { params });
  return Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
}

export async function getConcoursTip(id: number | string): Promise<ConcoursTip> {
  const r = await api.get(`${BASE}tips/${id}/`);
  return r.data;
}

export async function createConcoursTip(payload: Partial<ConcoursTip> & { title: string }): Promise<ConcoursTip> {
  const r = await api.post(`${BASE}tips/`, payload);
  return r.data;
}

export async function updateConcoursTip(id: number | string, payload: Partial<ConcoursTip>): Promise<ConcoursTip> {
  const r = await api.patch(`${BASE}tips/${id}/`, payload);
  return r.data;
}

export async function deleteConcoursTip(id: number | string): Promise<void> {
  await api.delete(`${BASE}tips/${id}/`);
}

export async function toggleSaveTip(id: number | string): Promise<{ is_saved: boolean }> {
  const r = await api.post(`${BASE}tips/${id}/save/`);
  return r.data;
}

export async function voteTip(id: number | string, value: 1 | 0 | -1): Promise<{ vote_count: number; user_vote: number }> {
  const r = await api.post(`${BASE}tips/${id}/vote/`, { value });
  return r.data;
}

/* ─────────────── Comments ─────────────── */

export interface ConcoursComment {
  id: number;
  target_type: 'exam' | 'tip';
  target_id: number;
  author: { id: number; username: string; avatar?: string | null };
  content: string;
  parent: number | null;
  created_at: string;
  updated_at: string;
  vote_count: number;
  user_vote: number;
  replies?: ConcoursComment[];
}

export async function listExamComments(examId: number | string): Promise<ConcoursComment[]> {
  const r = await api.get(`${BASE}exams/${examId}/comments/`);
  return r.data;
}

export async function postExamComment(examId: number | string, content: string, parent?: number): Promise<ConcoursComment> {
  const r = await api.post(`${BASE}exams/${examId}/comments/`, { content, parent });
  return r.data;
}

export async function listTipComments(tipId: number | string): Promise<ConcoursComment[]> {
  const r = await api.get(`${BASE}tips/${tipId}/comments/`);
  return r.data;
}

export async function postTipComment(tipId: number | string, content: string, parent?: number): Promise<ConcoursComment> {
  const r = await api.post(`${BASE}tips/${tipId}/comments/`, { content, parent });
  return r.data;
}

export async function updateConcoursComment(commentId: number, content: string): Promise<ConcoursComment> {
  const r = await api.patch(`${BASE}comments/${commentId}/`, { content });
  return r.data;
}

export async function deleteConcoursComment(commentId: number): Promise<void> {
  await api.delete(`${BASE}comments/${commentId}/`);
}

/* ─────────────── Simulation ─────────────── */

export interface SimulationStartPayload {
  mode: SimulationMode;
  concours_type: ConcoursType;
  exam_id?: number;
  n_questions?: number;
  duration_minutes?: number;
}

export interface SimulationSnapshotItem {
  exam_id: number;
  exam_display_id: number;
  position: number;
  question: ConcoursQuestion;
}

export interface SimulationStartResponse {
  session_id: string;
  mode: SimulationMode;
  concours_type: ConcoursType;
  exam: number | null;
  duration_minutes: number;
  started_at: string;
  total_questions: number;
  questions_snapshot: SimulationSnapshotItem[];
}

export async function startSimulation(payload: SimulationStartPayload): Promise<SimulationStartResponse> {
  const r = await api.post(`${BASE}sessions/start/`, payload);
  return r.data;
}

export interface SimulationSessionView {
  session_id: string;
  mode: SimulationMode;
  concours_type: ConcoursType;
  exam: number | null;
  duration_minutes: number;
  started_at: string;
  status: 'in_progress' | 'submitted' | 'expired';
  total_questions: number;
  questions_snapshot: SimulationSnapshotItem[];
  answers: Record<number, string>;
}

export async function getSimulationSession(sessionId: string): Promise<SimulationSessionView> {
  const r = await api.get(`${BASE}sessions/${sessionId}/`);
  return r.data;
}

export async function answerSimulationQuestion(
  sessionId: string,
  position: number,
  chosenKey: string,
): Promise<void> {
  await api.post(`${BASE}sessions/${sessionId}/answer/`, { position, chosen_key: chosenKey });
}

export interface BreakdownEntry {
  subject_id: number | null;
  subject_name: string | null;
  subfield_id: number | null;
  subfield_name: string | null;
  total: number;
  correct: number;
  positions: number[];
}

export interface SimulationRecap {
  session_id: string;
  mode: SimulationMode;
  concours_type: ConcoursType;
  exam_id: number | null;
  duration_minutes: number;
  started_at: string;
  submitted_at: string | null;
  status: 'submitted' | 'expired' | 'in_progress';
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  questions_snapshot: SimulationSnapshotItem[];
  answers: Record<number, { chosen_key: string; is_correct: boolean }>;
  breakdown: BreakdownEntry[];
}

export async function submitSimulation(sessionId: string): Promise<SimulationRecap> {
  const r = await api.post(`${BASE}sessions/${sessionId}/submit/`);
  return r.data;
}

export async function getSimulationRecap(sessionId: string): Promise<SimulationRecap> {
  const r = await api.get(`${BASE}sessions/${sessionId}/recap/`);
  return r.data;
}

export interface SimulationSessionListItem {
  id: string;
  mode: SimulationMode;
  mode_display: string;
  concours_type: ConcoursType;
  concours_type_display: string;
  exam: number | null;
  exam_title: string | null;
  duration_minutes: number;
  started_at: string;
  submitted_at: string | null;
  status: 'in_progress' | 'submitted' | 'expired';
  total_questions: number;
  correct_count: number;
  score_percentage: number;
}

export async function listMySessions(params: { concours_type?: ConcoursType; status?: string; mode?: SimulationMode } = {}): Promise<SimulationSessionListItem[]> {
  const r = await api.get(`${BASE}sessions/`, { params });
  return r.data;
}

/* ─────────────── Exam stats + activity ─────────────── */

export interface DistributionEntry {
  id: number | null;
  name: string;
  count: number;
  pct: number;
}

export interface ExamInsightCard {
  title: string;
  text: string;
}

export interface ExamStats {
  exam_id: number;
  total_questions: number;
  distribution: {
    subject: DistributionEntry[];
    subfield: DistributionEntry[];
    chapter: DistributionEntry[];
  };
  comparison_html: string;
  insight_cards: ExamInsightCard[];
  updated_at: string | null;
}

export async function getExamStats(examId: number | string): Promise<ExamStats> {
  const r = await api.get(`${BASE}exams/${examId}/stats/`);
  return r.data;
}

export async function setExamStats(
  examId: number | string,
  payload: { comparison_html: string; insight_cards: ExamInsightCard[] },
): Promise<void> {
  await api.put(`${BASE}exams/${examId}/stats/`, payload);
}

export interface CommunitySessionEntry {
  score_percentage: number;
  correct_count: number;
  total_questions: number;
  submitted_at: string;
}

export interface ExamActivity {
  exam_id: number;
  community: CommunitySessionEntry[];
  mine: SimulationSessionListItem[] | null;  // null = anonymous
}

export async function getExamActivity(examId: number | string): Promise<ExamActivity> {
  const r = await api.get(`${BASE}exams/${examId}/activity/`);
  return r.data;
}
