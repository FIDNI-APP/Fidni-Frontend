// src/components/profile/SkillIQSection.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronRight, ChevronDown, CheckCircle,
  Target, Play, ArrowLeft, Loader2, XCircle,
  Trophy, BookOpen, Layers, Award
} from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { ProgressRing } from '@/components/ui/ProgressRing';

interface Chapter { id: number; name: string; }
interface Subject { id: number; name: string; chapters: Chapter[]; }
interface ClassLevel { id: number; name: string; subjects: Subject[]; }

interface SkillAssessment {
  id: number;
  chapter: number;
  chapter_name: string;
  subject_name: string;
  score: number;
  max_score: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  completed_at: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<number, number>;
  startedAt: Date;
}

export const SkillIQSection: React.FC = () => {
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<{
    chapterId: number;
    chapterName: string;
    subjectName: string;
  } | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<SkillAssessment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [taxonomyRes, assessmentsRes] = await Promise.all([
        api.get('/class-levels/?include_taxonomy=true'),
        api.get('/skill-assessments/my/').catch(() => ({ data: [] }))
      ]);
      setClassLevels(taxonomyRes.data || []);
      setAssessments(assessmentsRes.data || []);
    } catch (error) {
      console.error('Failed to load skill IQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChapterAssessment = (chapterId: number): SkillAssessment | undefined =>
    assessments.find(a => a.chapter === chapterId);

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'expert': return 'Expert';
      case 'advanced': return 'Avancé';
      case 'intermediate': return 'Intermédiaire';
      default: return 'Débutant';
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-violet-50 text-violet-700';
      case 'advanced': return 'bg-blue-50 text-blue-700';
      case 'intermediate': return 'bg-emerald-50 text-emerald-700';
      default: return 'bg-amber-50 text-amber-700';
    }
  };

  const getLevelRingColor = (level: string) => {
    switch (level) {
      case 'expert': return '#8b5cf6';
      case 'advanced': return '#2563eb';
      case 'intermediate': return '#10b981';
      default: return '#f59e0b';
    }
  };

  const startQuiz = async (chapterId: number, chapterName: string, subjectName: string) => {
    try {
      setActiveQuiz({ chapterId, chapterName, subjectName });
      setQuizLoading(true);
      setQuizResult(null);
      const response = await api.get(`/skill-assessments/quiz/${chapterId}/`);
      setQuizState({
        questions: response.data.questions,
        currentIndex: 0,
        answers: {},
        startedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to load quiz:', error);
      setActiveQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  };

  const answerQuestion = (questionId: number, optionIndex: number) => {
    if (!quizState) return;
    setQuizState({ ...quizState, answers: { ...quizState.answers, [questionId]: optionIndex } });
  };

  const nextQuestion = () => {
    if (!quizState || quizState.currentIndex >= quizState.questions.length - 1) return;
    setQuizState({ ...quizState, currentIndex: quizState.currentIndex + 1 });
  };

  const previousQuestion = () => {
    if (!quizState || quizState.currentIndex === 0) return;
    setQuizState({ ...quizState, currentIndex: quizState.currentIndex - 1 });
  };

  const submitQuiz = async () => {
    if (!quizState || !activeQuiz) return;
    try {
      setSubmitting(true);
      const response = await api.post(`/skill-assessments/submit/${activeQuiz.chapterId}/`, {
        answers: quizState.answers,
        time_spent: Math.floor((new Date().getTime() - quizState.startedAt.getTime()) / 1000)
      });
      setQuizResult(response.data);
      setQuizState(null);
      const assessmentsRes = await api.get('/skill-assessments/my/');
      setAssessments(assessmentsRes.data || []);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setQuizState(null);
    setQuizResult(null);
  };

  const totalAssessments = assessments.length;
  const averageScore = totalAssessments > 0
    ? Math.round(assessments.reduce((sum, a) => sum + (a.score / a.max_score) * 100, 0) / totalAssessments)
    : 0;
  const expertCount = assessments.filter(a => a.level === 'expert').length;
  const advancedCount = assessments.filter(a => a.level === 'advanced').length;
  const intermediateCount = assessments.filter(a => a.level === 'intermediate').length;

  const getSubjectCompletion = (subject: Subject) => {
    const assessed = subject.chapters.filter(c => getChapterAssessment(c.id)).length;
    return { assessed, total: subject.chapters.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Quiz View — Result
  if (activeQuiz && quizResult) {
    const scorePercent = Math.round((quizResult.score / quizResult.max_score) * 100);
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <button onClick={closeQuiz} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour</span>
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          <div className="bg-gradient-to-br from-violet-600 to-blue-600 p-8 text-center text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <ProgressRing
                percentage={scorePercent}
                size={96}
                strokeWidth={7}
                trackColor="rgba(255,255,255,0.2)"
                progressColor="#ffffff"
                className="mx-auto mb-4"
              >
                <Trophy className="w-8 h-8 text-white" />
              </ProgressRing>
            </motion.div>
            <h2 className="text-2xl font-bold mb-1">Quiz terminé !</h2>
            <p className="text-blue-200 text-sm">
              {activeQuiz.subjectName} - {activeQuiz.chapterName}
            </p>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-slate-900 mb-2">{scorePercent}%</div>
              <p className="text-slate-500">{quizResult.score} / {quizResult.max_score} points</p>
            </div>

            <div className="flex justify-center mb-8">
              <span className={`px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 ${getLevelBadgeColor(quizResult.level)}`}>
                <Award className="w-4 h-4" />
                Niveau : {getLevelLabel(quizResult.level)}
              </span>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startQuiz(activeQuiz.chapterId, activeQuiz.chapterName, activeQuiz.subjectName)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Refaire le quiz
              </button>
              <button
                onClick={closeQuiz}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Continuer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Quiz View — Loading
  if (activeQuiz && quizLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Loader2 className="w-7 h-7 animate-spin text-slate-500" />
        </div>
        <p className="text-slate-600 font-medium">Chargement du quiz...</p>
      </div>
    );
  }

  // Quiz View — In progress
  if (activeQuiz && quizState && quizState.questions.length > 0) {
    const currentQuestion = quizState.questions[quizState.currentIndex];
    const currentAnswer = quizState.answers[currentQuestion.id];
    const answeredCount = Object.keys(quizState.answers).length;
    const isLastQuestion = quizState.currentIndex === quizState.questions.length - 1;
    const allAnswered = answeredCount === quizState.questions.length;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <button onClick={closeQuiz} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Quitter</span>
          </button>
          <div className="text-sm text-slate-500 font-medium">{activeQuiz.chapterName}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Progression</span>
            <span className="text-sm font-bold text-slate-900">
              {quizState.currentIndex + 1} / {quizState.questions.length}
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((quizState.currentIndex + 1) / quizState.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              currentQuestion.difficulty === 'hard' ? 'bg-rose-50 text-rose-700' :
              currentQuestion.difficulty === 'medium' ? 'bg-amber-50 text-amber-700' :
              'bg-emerald-50 text-emerald-700'
            }`}>
              {currentQuestion.difficulty === 'hard' ? 'Difficile' :
               currentQuestion.difficulty === 'medium' ? 'Moyen' : 'Facile'}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-6">{currentQuestion.question}</h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => answerQuestion(currentQuestion.id, index)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  currentAnswer === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    currentAnswer === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300'
                  }`}>
                    {currentAnswer === index && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <span className={currentAnswer === index ? 'text-blue-900 font-medium' : 'text-slate-700'}>
                    {option}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex items-center justify-between">
          <button
            onClick={previousQuestion}
            disabled={quizState.currentIndex === 0}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Précédent
          </button>

          <div className="flex gap-1.5">
            {quizState.questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setQuizState({ ...quizState, currentIndex: idx })}
                className={`h-2.5 rounded-full transition-all ${
                  idx === quizState.currentIndex
                    ? 'bg-blue-600 w-7'
                    : quizState.answers[quizState.questions[idx].id] !== undefined
                      ? 'bg-blue-300 w-2.5'
                      : 'bg-slate-200 w-2.5'
                }`}
              />
            ))}
          </div>

          {isLastQuestion ? (
            <button
              onClick={submitQuiz}
              disabled={!allAnswered || submitting}
              className="px-5 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : 'Terminer'}
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={currentAnswer === undefined}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz View — No questions
  if (activeQuiz) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <XCircle className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-2">Quiz non disponible</h3>
        <p className="text-slate-500 text-sm mb-5">Aucune question n'est disponible pour ce chapitre.</p>
        <button onClick={closeQuiz} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
          Retour
        </button>
      </div>
    );
  }

  // Main view
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Asymmetric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Featured gradient card */}
        <div className="col-span-2 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-6">
            <ProgressRing
              percentage={averageScore}
              size={96}
              strokeWidth={7}
              trackColor="rgba(255,255,255,0.2)"
              progressColor="#ffffff"
            >
              <div className="text-center">
                <div className="text-2xl font-bold">{averageScore}%</div>
                <div className="text-[10px] text-blue-200">score</div>
              </div>
            </ProgressRing>
            <div>
              <div className="text-sm text-blue-200 font-medium">Score moyen</div>
              <div className="text-lg font-bold mt-0.5">{totalAssessments} quiz passés</div>
            </div>
          </div>
          {totalAssessments > 0 && (
            <div className="flex gap-2 mt-4">
              {expertCount > 0 && (
                <span className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">{expertCount} Expert</span>
              )}
              {advancedCount > 0 && (
                <span className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">{advancedCount} Avancé</span>
              )}
              {intermediateCount > 0 && (
                <span className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">{intermediateCount} Inter.</span>
              )}
            </div>
          )}
        </div>

        {/* Smaller stat cards */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-xs text-slate-500 font-medium">Expert</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{expertCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-500 font-medium">Avancé</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{advancedCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">Quiz passés</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalAssessments}</div>
        </div>
      </div>

      {/* Class levels accordion */}
      <div className="space-y-3">
        {classLevels.map((classLevel) => (
          <div key={classLevel.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpandedClass(expandedClass === classLevel.id ? null : classLevel.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-slate-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">{classLevel.name}</h3>
                  <p className="text-sm text-slate-500">
                    {classLevel.subjects.length} matière{classLevel.subjects.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                expandedClass === classLevel.id ? 'rotate-180' : ''
              }`} />
            </button>

            <AnimatePresence>
              {expandedClass === classLevel.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-100"
                >
                  {classLevel.subjects.map((subject) => {
                    const completion = getSubjectCompletion(subject);
                    const completionPct = completion.total > 0 ? Math.round((completion.assessed / completion.total) * 100) : 0;

                    return (
                      <div key={subject.id} className="border-b border-slate-50 last:border-b-0">
                        <button
                          onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                          className="w-full flex items-center justify-between p-4 pl-8 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-medium text-slate-900">{subject.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-500">
                                  {completion.assessed}/{completion.total} chapitres
                                </span>
                                <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${completionPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
                            expandedSubject === subject.id ? 'rotate-180' : ''
                          }`} />
                        </button>

                        <AnimatePresence>
                          {expandedSubject === subject.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="bg-slate-50/50"
                            >
                              <div className="p-2 pl-10 space-y-1">
                                {subject.chapters.map((chapter) => {
                                  const assessment = getChapterAssessment(chapter.id);
                                  const scorePercent = assessment
                                    ? Math.round((assessment.score / assessment.max_score) * 100)
                                    : 0;

                                  return (
                                    <div
                                      key={chapter.id}
                                      className="flex items-center justify-between p-3 rounded-lg hover:bg-white transition-colors"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {assessment ? (
                                          <ProgressRing
                                            percentage={scorePercent}
                                            size={32}
                                            strokeWidth={3}
                                            progressColor={getLevelRingColor(assessment.level)}
                                          >
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                          </ProgressRing>
                                        ) : (
                                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                                            <Target className="w-3.5 h-3.5 text-slate-400" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <h5 className="text-sm font-medium text-slate-900 truncate">{chapter.name}</h5>
                                          {assessment && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getLevelBadgeColor(assessment.level)}`}>
                                                {getLevelLabel(assessment.level)}
                                              </span>
                                              <span className="text-xs text-slate-400">{scorePercent}%</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => startQuiz(chapter.id, chapter.name, subject.name)}
                                        className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors ${
                                          assessment
                                            ? 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                      >
                                        <Play className="w-3.5 h-3.5" />
                                        {assessment ? 'Refaire' : 'Passer'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {classLevels.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Brain className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Aucun niveau disponible</h3>
            <p className="text-slate-500 text-sm">Les quiz Skill IQ seront bientôt disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillIQSection;
