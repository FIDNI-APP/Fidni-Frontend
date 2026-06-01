/**
 * Classroom API
 */
import { api } from './apiClient';

export interface UserMini {
  id: number;
  username: string;
  email?: string;
  avatar?: string | null;
}

export interface ClassroomSubject {
  id: number;
  subject_name: string;
  teacher: UserMini;
  teacher_username: string;
  created_at: string;
}

export interface Classroom {
  id: number;
  name: string;
  description: string;
  owner: UserMini;
  class_level_name?: string;
  join_code: string;
  subjects: ClassroomSubject[];
  student_count: number;
  is_owner: boolean;
  is_member: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassroomMember {
  id: number;
  student: UserMini;
  joined_at: string;
}

export interface WeeklyProgress {
  labels: string[];
  you: number[];
  average: number[];
  classroom: { id: number; name: string } | null;
  has_classroom: boolean;
}

const BASE = '/classrooms/';

export async function listClassrooms(): Promise<Classroom[]> {
  const r = await api.get(BASE);
  // DRF DefaultRouter pagination: may return {results: [...]} or array
  return Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
}

export async function getClassroom(id: number | string): Promise<Classroom> {
  const r = await api.get(`${BASE}${id}/`);
  return r.data;
}

export async function createClassroom(payload: {
  name: string;
  description?: string;
  class_level_id?: number | null;
}): Promise<Classroom> {
  const r = await api.post(BASE, payload);
  return r.data;
}

export async function updateClassroom(
  id: number | string,
  payload: Partial<{ name: string; description: string; class_level_id: number | null }>,
): Promise<Classroom> {
  const r = await api.patch(`${BASE}${id}/`, payload);
  return r.data;
}

export async function deleteClassroom(id: number | string): Promise<void> {
  await api.delete(`${BASE}${id}/`);
}

export async function regenerateJoinCode(id: number | string): Promise<{ join_code: string }> {
  const r = await api.post(`${BASE}${id}/regenerate_code/`);
  return r.data;
}

export async function getMembers(id: number | string): Promise<ClassroomMember[]> {
  const r = await api.get(`${BASE}${id}/members/`);
  return r.data;
}

export async function removeMember(id: number | string, studentId: number): Promise<void> {
  await api.delete(`${BASE}${id}/members/${studentId}/`);
}

export async function addSubject(
  id: number | string,
  payload: { subject_id: number; teacher_id?: number },
): Promise<ClassroomSubject> {
  const r = await api.post(`${BASE}${id}/subjects/`, payload);
  return r.data;
}

export async function removeSubject(id: number | string, subjectId: number): Promise<void> {
  await api.delete(`${BASE}${id}/subjects/${subjectId}/`);
}

export async function joinClassroom(code: string): Promise<Classroom> {
  const r = await api.post(`${BASE}join/`, { code: code.trim().toUpperCase() });
  return r.data;
}

export async function leaveClassroom(id: number | string): Promise<void> {
  await api.post(`${BASE}${id}/leave/`);
}

export async function getWeeklyProgress(classroomId?: number | string): Promise<WeeklyProgress> {
  const params = classroomId ? { classroom_id: classroomId } : undefined;
  const r = await api.get(`${BASE}progress/weekly/`, { params });
  return r.data;
}

/* ─────────────────── TD lists ─────────────────── */

export interface TDListItem {
  id: number;
  content_id?: number;
  content_title: string;
  content_display_id: number;
  content_difficulty: string | null;
  content_subject: string | null;
  position: number;
  added_at: string;
}

export interface TDList {
  id: number;
  classroom: number;
  title: string;
  description: string;
  subject_name?: string | null;
  created_by_username?: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  items: TDListItem[];
  item_count: number;
  progress: { completed: number; total: number } | null;
}

export async function listTDLists(classroomId: number | string): Promise<TDList[]> {
  const r = await api.get(`${BASE}${classroomId}/td-lists/`);
  return Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
}

export async function createTDList(
  classroomId: number | string,
  payload: { title: string; description?: string; subject_id?: number | null; due_date?: string | null },
): Promise<TDList> {
  const r = await api.post(`${BASE}${classroomId}/td-lists/`, payload);
  return r.data;
}

export async function updateTDList(
  classroomId: number | string,
  tdId: number | string,
  payload: Partial<{ title: string; description: string; subject_id: number | null; due_date: string | null }>,
): Promise<TDList> {
  const r = await api.patch(`${BASE}${classroomId}/td-lists/${tdId}/`, payload);
  return r.data;
}

export async function deleteTDList(classroomId: number | string, tdId: number | string): Promise<void> {
  await api.delete(`${BASE}${classroomId}/td-lists/${tdId}/`);
}

export async function addTDListItem(
  classroomId: number | string,
  tdId: number | string,
  contentId: number | string,
): Promise<TDListItem> {
  const r = await api.post(`${BASE}${classroomId}/td-lists/${tdId}/items/`, { content_id: contentId });
  return r.data;
}

export async function removeTDListItem(
  classroomId: number | string,
  tdId: number | string,
  itemId: number | string,
): Promise<void> {
  await api.delete(`${BASE}${classroomId}/td-lists/${tdId}/items/${itemId}/`);
}

/* ─────────────────── Skill stats (FIFA radar) ─────────────────── */

export interface SkillAxes {
  precision: number;
  regularite: number;
  vitesse: number;
  difficulte: number;
  perseverance: number;
  engagement: number;
}

export interface StudentSkillStats {
  student: { id: number; username: string };
  subject: { id: number; name: string } | null;
  axes: SkillAxes;
  overall: number;
}

export interface RosterStudentCard {
  student: { id: number; username: string; avatar?: string | null };
  overall: number;
  axes: SkillAxes;
}

export interface RosterStats {
  classroom_id: number;
  subject_id: number | null;
  students: RosterStudentCard[];
}

export async function getStudentStats(
  classroomId: number | string,
  options: { studentId?: number; subjectId?: number | null } = {},
): Promise<StudentSkillStats> {
  const params: Record<string, any> = {};
  if (options.studentId) params.student_id = options.studentId;
  if (options.subjectId) params.subject_id = options.subjectId;
  const r = await api.get(`${BASE}${classroomId}/student-stats/`, { params });
  return r.data;
}

export async function getRosterStats(
  classroomId: number | string,
  subjectId?: number | null,
): Promise<RosterStats> {
  const params: Record<string, any> = {};
  if (subjectId) params.subject_id = subjectId;
  const r = await api.get(`${BASE}${classroomId}/roster-stats/`, { params });
  return r.data;
}
