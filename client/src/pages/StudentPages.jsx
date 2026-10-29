import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  Award,
  Clock,
  CheckCircle2,
  PlayCircle,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Send,
  Save,
  Network
} from 'lucide-react';
import { lmsApi, extractErrorMessage } from '../services/api';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
  ModalDialog,
  useToast
} from '../components/ui/SharedComponents';

// Helper to generate and download a high-resolution PNG Digital Course Mastery Badge
function downloadCourseBadgePng(cert) {
  const courseCode = cert?.courseCode || cert?.course?.code || 'COURSE';
  const courseTitle = cert?.courseTitle || cert?.course?.title || 'Course Mastery';
  const recipient = cert?.recipientName || 'Verified Student';
  const scorePct = Math.round(Number(cert?.finalScore || 100));
  const certCode = cert?.certificateCode || 'AIT-BADGE-VERIFIED';
  const issuedDate = cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : new Date().toLocaleDateString();

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 720;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  // Background card
  const bgGrad = ctx.createLinearGradient(0, 0, 640, 720);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#064e3b');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 640, 720);

  // Outer gold/emerald border
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 604, 684);

  // Draw Hexagon Shield in center
  const cx = 320;
  const cy = 265;
  const r = 135;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const hexGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  hexGrad.addColorStop(0, '#059669');
  hexGrad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = hexGrad;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  // Header text
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AETHERIA INSTITUTE & NETWORKING ACADEMY', 320, 66);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('★ OFFICIAL DIGITAL COURSE MASTERY BADGE ★', 320, 98);

  // Inside Hexagon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px monospace';
  ctx.fillText(courseCode, cx, cy - 18);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${scorePct}% MASTERY`, cx, cy + 24);

  ctx.fillStyle = '#d1fae5';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('VERIFIED PASS', cx, cy + 58);

  // Course Title below hexagon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  const words = courseTitle.split(' ');
  let line = '';
  let y = 455;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 520) {
      ctx.fillText(line, 320, y);
      line = w;
      y += 30;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 320, y);

  // Recipient & Verification Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  ctx.fillText('Awarded To', 320, 550);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(recipient, 320, 584);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px monospace';
  ctx.fillText(`Credential ID: ${certCode} · Issued: ${issuedDate}`, 320, 645);

  const link = document.createElement('a');
  link.download = `Badge-${courseCode}-${recipient.replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Helper to generate and download a high-resolution PNG Official Certificate of Completion
function downloadCertificatePng(cert) {
  const courseCode = cert?.courseCode || cert?.course?.code || 'COURSE';
  const courseTitle = cert?.courseTitle || cert?.course?.title || 'Course Completion';
  const recipient = cert?.recipientName || 'Verified Student';
  const scorePct = Number(cert?.finalScore || 100);
  const certCode = cert?.certificateCode || 'AIT-CERT-VERIFIED';
  const verifyHash = cert?.verificationHash || 'verified-sha256-credential';
  const issuedDate = cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : new Date().toLocaleDateString();

  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 980;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  // Ivory/Parchment background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1400, 980);

  // Outer Navy Border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 16;
  ctx.strokeRect(30, 30, 1340, 920);

  // Inner Gold/Blue Border
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 4;
  ctx.strokeRect(52, 52, 1296, 876);

  // Institution Header
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AETHERIA INSTITUTE OF TECHNOLOGY & NETWORKING ACADEMY', 700, 145);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 48px serif';
  ctx.fillText('CERTIFICATE OF COURSE COMPLETION', 700, 220);

  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 22px serif';
  ctx.fillText('This official academic credential certifies that', 700, 300);

  // Recipient Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(recipient, 700, 385);

  // Divider line under name
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(350, 410);
  ctx.lineTo(1050, 410);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '22px sans-serif';
  ctx.fillText(
    'has successfully completed all curriculum modules, laboratories, and checkpoint quizzes for',
    700,
    470
  );

  // Course Code & Title
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${courseCode}: ${courseTitle}`, 700, 540);

  // Final Percentage Badge pill
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`Final Course Mastery Score: ${scorePct}% (100% Completed)`, 700, 605);

  // Signatures & Seal
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Dr. Elena Vance, PhD', 360, 760);
  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText('Lead Course Instructor', 360, 788);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Marcus Sterling, MSc', 1040, 760);
  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText('Office of the Academic Registrar', 1040, 788);

  // Verification metadata
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`Certificate Code: ${certCode}   |   Issued Date: ${issuedDate}`, 700, 865);
  ctx.fillStyle = '#64748b';
  ctx.font = '13px monospace';
  ctx.fillText(`SHA-256 Verification Hash: ${verifyHash}`, 700, 895);

  const link = document.createElement('a');
  link.download = `Certificate-${courseCode}-${certCode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function StudentDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading your personalized learning dashboard..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Learner Portal"
        title="Personalized Learning & Progress Dashboard"
        subtitle="Track enrolled courses, resume interactive lessons, complete laboratory assignments, and monitor grades."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Enrolled Courses"
          value={m.enrolledCoursesCount ?? 0}
          subtitle={`Overall Progress: ${m.overallCourseProgress ?? 0}%`}
          icon={BookOpen}
          accent="blue"
        />
        <StatCard
          title="Pending Assignments"
          value={m.pendingAssignmentsCount ?? 0}
          subtitle="Active lab & coding deliverables"
          icon={Terminal}
          accent="amber"
        />
        <StatCard
          title="Available Assessments"
          value={m.upcomingExamsCount ?? 0}
          subtitle="Quizzes & examinations"
          icon={ClipboardCheck}
          accent="indigo"
        />
        <StatCard
          title="Earned Certificates"
          value={m.earnedCertificatesCount ?? 0}
          subtitle={`${m.recentGradesCount ?? 0} published grade items`}
          icon={Award}
          accent="emerald"
        />
      </div>

      {/* Enrolled Courses Progress Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Enrolled Courses & Learning Progress</h2>
            <p className="text-xs text-slate-500">Resume where you left off in your current semester sections</p>
          </div>
          <Link
            to="/student/courses"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            Open Learning Reader →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(d.enrolledCourses || []).map((course) => (
            <div key={course.membershipId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {course.courseCode} · {course.sectionCode}
                </span>
                <span className="text-xs font-bold text-slate-700">{course.progressPercentage}% Complete</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{course.courseTitle}</h3>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, course.progressPercentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Lessons: {course.completedLessonsCount} / {course.totalLessonsCount}</span>
                <Link to="/student/courses" className="font-bold text-blue-600 hover:underline">
                  Resume Course →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Assignments & Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Upcoming Assignment Deadlines</h2>
          <div className="space-y-2.5">
            {(d.pendingAssignments || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4">All assignments submitted!</p>
            ) : (
              (d.pendingAssignments || []).map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900">{a.title}</p>
                  <p className="text-slate-500 mt-0.5">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Published Grades */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Recent Published Grades</h2>
          <div className="space-y-2.5">
            {(d.recentPublishedGrades || []).map((g) => (
              <div key={g.id} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{g.itemTitle}</p>
                  <p className="text-slate-600">{g.feedback}</p>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {g.score} / {g.maxScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements & Recently Accessed Lessons */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Recent Announcements</h2>
          <div className="space-y-2.5">
            {(d.unreadAnnouncements || []).map((ann) => (
              <div key={ann.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-900">{ann.title}</p>
                <p className="text-slate-600 line-clamp-2 mt-0.5">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentCatalogPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses', 'catalog'],
    queryFn: () => lmsApi.listCourses({ publicationStatus: 'published' })
  });

  const handleEnroll = async (classId) => {
    try {
      const res = await lmsApi.enrollStudent({ classId });
      addToast(res.message);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const courses = coursesData?.data?.courses || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Institutional Course Catalog"
        title="Explore Technical Courses & Self-Enroll in Active Sections"
        subtitle="Browse Cisco NetAcad-inspired courses in networking, integrative programming, cybersecurity, and databases."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                  {course.code}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {course.level} · {course.creditUnits} Units · {course.deliveryMode}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{course.title}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>

              {(course.learningObjectives || []).length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Learning Objectives:</p>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                    {course.learningObjectives.slice(0, 3).map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-700">Available Term Sections:</p>
              {(course.offerings || []).flatMap((o) => o.classes || []).map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{cls.sectionCode}</span>
                    <span className="text-slate-500 ml-2">{cls.schedule}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEnroll(cls.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                  >
                    Enroll in Section
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentCourseLearningPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState(1);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [quizAnswersMap, setQuizAnswersMap] = useState({});
  const [lastQuizResult, setLastQuizResult] = useState(null);

  const { data: enrollmentsData, isLoading: enrollLoading } = useQuery({
    queryKey: ['enrollments', 'student'],
    queryFn: () => lmsApi.listEnrollments()
  });

  const enrollments = enrollmentsData?.data?.enrollments || [];
  const activeEnrollment = enrollments.find((e) => e.classId === selectedClassId) || enrollments[0];
  const activeClassId = activeEnrollment?.classId || 1;
  const activeCourseId = activeEnrollment?.classSection?.courseOffering?.course?.id || 1;

  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ['course', activeCourseId],
    queryFn: () => lmsApi.getCourseById(activeCourseId),
    enabled: Boolean(activeCourseId)
  });

  const { data: progressData } = useQuery({
    queryKey: ['progress', activeClassId],
    queryFn: () => lmsApi.getProgressAnalytics({ classId: activeClassId }),
    enabled: Boolean(activeClassId)
  });

  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments', 'class', activeClassId],
    queryFn: () => lmsApi.listAssessments({ classId: activeClassId }),
    enabled: Boolean(activeClassId)
  });

  const { data: certificatesData } = useQuery({
    queryKey: ['certificates'],
    queryFn: lmsApi.listCertificates
  });

  const course = courseData?.data?.course;
  const allLessons = (course?.modules || []).flatMap((m) => m.lessons || []);
  const currentLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0];
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);

  const completedLessonIds = new Set(
    (progressData?.data?.lessonProgress || [])
      .filter((lp) => lp.status === 'completed')
      .map((lp) => lp.lessonId)
  );
  const courseProgressRecord = progressData?.data?.courseProgress?.[0];
  const courseProgressPct = courseProgressRecord?.progressPercentage || 0;
  const isCourseCompleted = Boolean(courseProgressRecord?.isCompleted);

  const allCertificates = certificatesData?.data?.certificates || [];
  const activeCourseCertificate =
    allCertificates.find((c) => c.classId === activeClassId || c.courseId === activeCourseId) || {
      courseCode: course?.code || 'COURSE',
      courseTitle: course?.title || 'Completed Course',
      recipientName: 'Verified Student',
      finalScore: 100,
      certificateCode: `AIT-CERT-2026-${activeClassId}`,
      verificationHash: 'verified-sha256-credential',
      issuedAt: new Date().toISOString()
    };

  const classAssessments = assessmentsData?.data?.assessments || [];
  const courseQuizzes = classAssessments.filter((a) =>
    ['quiz', 'module_exam'].includes(a.assessmentType)
  );
  const requiredQuizzes = courseQuizzes.length > 0 ? courseQuizzes : classAssessments;

  const isQuizPassed = (asmt) => {
    const attempts = asmt.attempts || [];
    const passMark = Number(asmt.passingScore || 75);
    return attempts.some(
      (att) => ['submitted', 'graded'].includes(att.status) && Number(att.totalScore || 0) >= passMark
    );
  };

  const getQuizBestScore = (asmt) => {
    const attempts = (asmt.attempts || []).filter((att) => ['submitted', 'graded'].includes(att.status));
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map((att) => Number(att.totalScore || 0)));
  };

  const nextUnpassedQuiz = requiredQuizzes.find((q) => !isQuizPassed(q)) || requiredQuizzes[0];

  const completeMutation = useMutation({
    mutationFn: ({ lessonId }) =>
      lmsApi.updateLessonProgress({
        classId: activeClassId,
        lessonId,
        status: 'completed',
        timeSpentSeconds: 180
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    }
  });

  // NetAcad Automatic Lesson Progress: When a student views a lesson in the studio, automatically record lesson completion
  useEffect(() => {
    if (
      !activeQuizSession &&
      currentLesson?.id &&
      activeClassId &&
      progressData &&
      !completedLessonIds.has(currentLesson.id) &&
      !completeMutation.isPending
    ) {
      completeMutation.mutate({ lessonId: currentLesson.id });
    }
  }, [currentLesson?.id, activeClassId, Boolean(progressData), activeQuizSession]);

  const handleOpenEmbeddedQuiz = async (quiz) => {
    try {
      setLastQuizResult(null);
      const res = await lmsApi.startAttempt(quiz.id);
      const { attempt, questions } = res.data;
      const initialMap = {};
      for (const saved of attempt.savedAnswers || []) {
        initialMap[saved.questionId] = {
          questionId: saved.questionId,
          selectedOptionIds: saved.selectedOptionIds || [],
          textAnswer: saved.textAnswer || '',
          matchingResponse: saved.matchingResponse || {}
        };
      }
      setQuizAnswersMap(initialMap);
      setActiveQuizSession({ quiz, attempt, questions });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const updateEmbeddedQuizAnswer = (questionId, patch) => {
    setQuizAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId, selectedOptionIds: [], textAnswer: '', matchingResponse: {} }),
        ...patch
      }
    }));
  };

  const handleSubmitEmbeddedQuiz = async () => {
    if (!activeQuizSession) return;
    try {
      const res = await lmsApi.submitAttempt(
        activeQuizSession.attempt.id,
        Object.values(quizAnswersMap)
      );
      const submittedAttempt = res.data?.attempt;
      const maxScore = Number(res.data?.maxScore || activeQuizSession.quiz?.maxScore || 100);
      const score = Number(submittedAttempt?.totalScore || 0);
      const percentage =
        res.data?.percentage !== undefined
          ? Number(res.data.percentage)
          : maxScore > 0
          ? Number(((score / maxScore) * 100).toFixed(1))
          : 0;
      const passMark = Number(activeQuizSession.quiz?.passingScore || 75);
      const passed = percentage >= passMark;

      setLastQuizResult({
        quiz: activeQuizSession.quiz,
        quizTitle: activeQuizSession.quiz?.title,
        score,
        maxScore,
        percentage,
        passMark,
        passed
      });
      setActiveQuizSession(null);

      addToast(
        passed
          ? `Checkpoint Quiz Passed — Result: ${percentage}% (${score}/${maxScore} pts)!`
          : `Quiz Result: ${percentage}% (${score}/${maxScore} pts). ${passMark}% is required to pass.`
      );

      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (enrollLoading || courseLoading) return <LoadingState label="Loading interactive course reader..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
            {course?.code} · NetAcad Interactive Curriculum & Checkpoint Quiz Studio
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{course?.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeClassId}
            onChange={(e) => {
              setSelectedClassId(Number(e.target.value));
              setActiveLessonId(null);
              setActiveQuizSession(null);
              setLastQuizResult(null);
            }}
            aria-label="Switch enrolled class"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
          >
            {enrollments.map((en) => (
              <option key={en.id} value={en.classId}>
                {en.classSection?.sectionCode} — {en.classSection?.courseOffering?.course?.title}
              </option>
            ))}
          </select>
          <div
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
              isCourseCompleted
                ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                : 'text-blue-700 bg-blue-50 border-blue-200'
            }`}
          >
            {isCourseCompleted ? '✓ 100% Course Completed' : `Course Progress: ${courseProgressPct}%`}
          </div>
        </div>
      </div>

      {/* Automatic Course Completion: Digital Badge & Official Certificate Showcase */}
      {isCourseCompleted && (
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-emerald-500/30 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
            <div className="flex items-center gap-4">
              {/* Visual Hexagonal / Shield Digital Course Mastery Badge */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 p-0.5 shadow-md shrink-0">
                <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex flex-col items-center justify-center text-center px-1">
                  <Award className="w-6 h-6 text-amber-400" />
                  <span className="text-[9px] font-mono font-extrabold text-emerald-300 leading-tight mt-0.5">
                    {course?.code}
                  </span>
                  <span className="text-[8px] font-bold uppercase text-amber-300">BADGE</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                  ★ NetAcad Automatic Course Completion · Digital Badge & Certificate Unlocked
                </span>
                <h2 className="text-lg font-extrabold text-white">
                  Congratulations! You completed {course?.code}: {course?.title}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Final Mastery Score: <strong className="text-emerald-300">{activeCourseCertificate.finalScore}%</strong> · Credential Code: <strong className="font-mono text-amber-300">{activeCourseCertificate.certificateCode}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => downloadCourseBadgePng(activeCourseCertificate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Badge (.PNG)
              </button>
              <button
                type="button"
                onClick={() => downloadCertificatePng(activeCourseCertificate)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Certificate (.PNG)
              </button>
              <Link
                to="/student/certificates"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-lg"
              >
                View All Completed Courses & Badges →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Submission Percentage Result Summary Card */}
      {lastQuizResult && (
        <div
          className={`p-5 rounded-2xl border-2 shadow-xs space-y-4 ${
            lastQuizResult.passed
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Prominent Quiz Percentage Circle */}
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 ${
                  lastQuizResult.passed
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-amber-500 text-slate-950 border-amber-600'
                }`}
              >
                <span className="text-xl font-extrabold font-mono leading-none">
                  {lastQuizResult.percentage}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  Quiz Score
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                  {lastQuizResult.passed
                    ? '✓ NetAcad Checkpoint Quiz Passed'
                    : 'Checkpoint Quiz Attempt Completed'}
                </span>
                <h3 className="text-base font-extrabold">{lastQuizResult.quizTitle}</h3>
                <p className="text-xs mt-1">
                  Result Percentage: <strong className="font-mono text-sm">{lastQuizResult.percentage}%</strong>{' '}
                  ({lastQuizResult.score} / {lastQuizResult.maxScore} points) · Passing Score Required:{' '}
                  <strong>{lastQuizResult.passMark}%</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!lastQuizResult.passed && lastQuizResult.quiz && (
                <button
                  type="button"
                  onClick={() => handleOpenEmbeddedQuiz(lastQuizResult.quiz)}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  Retake Quiz
                </button>
              )}
              <button
                type="button"
                onClick={() => setLastQuizResult(null)}
                className="px-3 py-1.5 rounded-lg border border-current text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Visual Quiz Percentage Bar */}
          <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 ${
                lastQuizResult.passed ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, lastQuizResult.percentage))}%` }}
            />
          </div>
        </div>
      )}

      {/* Main NetAcad Split View: Left Module/Lesson + Quiz Hierarchy, Right Content/Quiz Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Course Navigation Sidebar */}
        <aside className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>1. Modules & Lessons (Auto-Tracked)</span>
            <span className="text-[11px] text-emerald-400">
              {completedLessonIds.size}/{allLessons.length} Read
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {(course?.modules || []).map((mod) => (
              <div key={mod.id} className="p-3.5 space-y-2">
                <p className="text-xs font-bold text-slate-900">{mod.title}</p>
                <div className="space-y-1">
                  {(mod.lessons || []).map((les) => {
                    const isCompleted = completedLessonIds.has(les.id);
                    const isSelected = !activeQuizSession && currentLesson?.id === les.id;
                    return (
                      <button
                        key={les.id}
                        type="button"
                        onClick={() => {
                          setActiveQuizSession(null);
                          setActiveLessonId(les.id);
                        }}
                        className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{les.title}</span>
                        {isCompleted ? (
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                        ) : (
                          <PlayCircle className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* NetAcad Mandatory Course Completion Quizzes Section */}
          <div className="px-4 py-3 bg-indigo-950 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between border-t border-slate-800">
            <span>2. Course Completion Quizzes</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-800 text-indigo-200">
              Required to Finish
            </span>
          </div>
          <div className="p-3.5 space-y-2 bg-indigo-50/40">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Just like Cisco NetAcad, complete the checkpoint quiz(zes) below to verify what you learned and automatically complete the course.
            </p>
            {requiredQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No quizzes configured for this section.</p>
            ) : (
              requiredQuizzes.map((qz) => {
                const passed = isQuizPassed(qz);
                const best = getQuizBestScore(qz);
                const isSelectedQuiz = activeQuizSession?.quiz?.id === qz.id;
                return (
                  <button
                    key={qz.id}
                    type="button"
                    onClick={() => handleOpenEmbeddedQuiz(qz)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                      isSelectedQuiz
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : passed
                        ? 'bg-white border-emerald-300 text-slate-900 hover:bg-emerald-50/50'
                        : 'bg-white border-indigo-200 text-slate-900 hover:border-indigo-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">{qz.title}</p>
                      <p className={`text-[11px] ${isSelectedQuiz ? 'text-indigo-200' : 'text-slate-500'}`}>
                        Pass Required: {qz.passingScore || 75}% · {qz.timeLimitMinutes} mins
                        {best !== null ? ` · Best: ${best}%` : ''}
                      </p>
                    </div>
                    {passed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        ✓ Passed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                        Take Quiz
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Viewer Area: Either Embedded NetAcad Quiz Runner OR Lesson Content */}
        <section className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          {activeQuizSession ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                    NetAcad Course Knowledge Verification Quiz · Attempt #{activeQuizSession.attempt.attemptNumber}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">{activeQuizSession.quiz.title}</h2>
                  <p className="text-xs text-slate-600 mt-1">{activeQuizSession.quiz.instructions}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveQuizSession(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back to Lessons
                </button>
              </div>

              <div className="space-y-5">
                {activeQuizSession.questions.map((q, idx) => {
                  const ans = quizAnswersMap[q.questionId] || {
                    selectedOptionIds: [],
                    textAnswer: '',
                    matchingResponse: {}
                  };
                  return (
                    <div key={q.questionId} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-indigo-700">
                          Question {idx + 1} of {activeQuizSession.questions.length} ({q.questionType.replace(/_/g, ' ')})
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{q.points} pts</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{q.prompt}</p>

                      {['multiple_choice', 'true_false', 'identification', 'fill_in_the_blank'].includes(q.questionType) && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt) => {
                            const selected = (ans.selectedOptionIds || []).includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs font-medium bg-white ${
                                  selected ? 'border-indigo-600 ring-1 ring-indigo-600 text-indigo-950' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`embedded-q-${q.questionId}`}
                                  checked={selected}
                                  onChange={() =>
                                    updateEmbeddedQuizAnswer(q.questionId, { selectedOptionIds: [opt.id] })
                                  }
                                />
                                <span>{opt.optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.questionType === 'multiple_select' && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt) => {
                            const selected = (ans.selectedOptionIds || []).includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs font-medium bg-white ${
                                  selected ? 'border-indigo-600 ring-1 ring-indigo-600 text-indigo-950' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(e) => {
                                    const prevIds = ans.selectedOptionIds || [];
                                    const nextIds = e.target.checked
                                      ? [...prevIds, opt.id]
                                      : prevIds.filter((id) => id !== opt.id);
                                    updateEmbeddedQuizAnswer(q.questionId, { selectedOptionIds: nextIds });
                                  }}
                                />
                                <span>{opt.optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.questionType === 'matching' && (
                        <div className="space-y-2">
                          {(q.matchingPrompts || []).map((leftItem) => (
                            <div
                              key={leftItem}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                            >
                              <span className="font-bold text-slate-800">{leftItem}</span>
                              <select
                                value={ans.matchingResponse?.[leftItem] || ''}
                                onChange={(e) =>
                                  updateEmbeddedQuizAnswer(q.questionId, {
                                    matchingResponse: {
                                      ...(ans.matchingResponse || {}),
                                      [leftItem]: e.target.value
                                    }
                                  })
                                }
                                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                              >
                                <option value="">Select match...</option>
                                {(q.matchingChoices || []).map((choice) => (
                                  <option key={choice} value={choice}>
                                    {choice}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Passing Score Required: <strong>{activeQuizSession.quiz.passingScore || 75}%</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSubmitEmbeddedQuiz}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Submit Quiz & Verify Course Completion →
                </button>
              </div>
            </div>
          ) : currentLesson ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={currentLesson.lessonType} />
                    <span className="text-xs text-slate-500">
                      Estimated Time: {currentLesson.estimatedMinutes} mins
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">{currentLesson.title}</h2>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedLessonIds.has(currentLesson.id)
                      ? 'Lesson Completed Automatically'
                      : 'Recording Lesson Progress...'}
                  </span>
                </div>
              </div>

              {/* Learning Objectives */}
              {(currentLesson.learningObjectives || []).length > 0 && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5">
                  <p className="font-bold text-blue-900 uppercase tracking-wider">Lesson Learning Objectives</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {currentLesson.learningObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rich-Text Lesson Content */}
              <div
                className="lesson-prose text-sm"
                dangerouslySetInnerHTML={{ __html: currentLesson.contentHtml }}
              />

              {/* Interactive Network Lab Topology Viewer */}
              {currentLesson.labTopologyData?.devices && (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                    <Network className="w-4 h-4" />
                    Interactive Network Pod Topology
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {currentLesson.labTopologyData.devices.map((dev, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                        <p className="font-mono font-bold text-white">{dev.name}</p>
                        <p className="text-blue-300">{dev.role}</p>
                        <p className="font-mono text-[11px] text-emerald-400 mt-1">IP: {dev.ip}</p>
                        <p className="text-[11px] text-slate-400">{dev.protocol}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Code Block */}
              {currentLesson.codeSnippet && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Technical Code / CLI Reference ({currentLesson.codeLanguage || 'code'})</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                    {currentLesson.codeSnippet}
                  </pre>
                </div>
              )}

              {/* Downloadable Resources */}
              {(course?.resources || []).length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Attached Learning Resources & Lab Worksheets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(course.resources || []).map((res) => (
                      <a
                        key={res.id}
                        href={res.externalUrl || res.fileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{res.title}</p>
                          <p className="text-slate-500 uppercase text-[10px]">{res.resourceType}</p>
                        </div>
                        <Download className="w-4 h-4 text-blue-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous & Next / Proceed to Course Completion Quiz Controls */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={() => setActiveLessonId(allLessons[currentIndex - 1]?.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 disabled:opacity-40 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Lesson
                </button>

                {currentIndex < allLessons.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!completedLessonIds.has(currentLesson.id)) {
                        completeMutation.mutate({ lessonId: currentLesson.id });
                      }
                      setActiveLessonId(allLessons[currentIndex + 1]?.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
                  >
                    Next Lesson (Auto-Complete)
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : nextUnpassedQuiz ? (
                  <button
                    type="button"
                    onClick={() => handleOpenEmbeddedQuiz(nextUnpassedQuiz)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs"
                  >
                    <span>Take Course Completion Quiz: {nextUnpassedQuiz.title}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a lesson from the sidebar to begin.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export function StudentAssignmentsPage() {
  const { subview } = useParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [textResponse, setTextResponse] = useState('');
  const [codeSubmission, setCodeSubmission] = useState('');

  const currentTab = subview || 'all';

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', 'student'],
    queryFn: () => lmsApi.listAssignments()
  });

  const handleSubmitWork = async (isDraft = false) => {
    if (!activeAssignment) return;
    try {
      const res = await lmsApi.submitAssignment(activeAssignment.id, {
        textResponse,
        codeSubmission,
        isDraft
      });
      addToast(res.message);
      setActiveAssignment(null);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const assignments = data?.data?.assignments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Coursework & Technical Labs"
        title="Assignments, Submissions, Rubrics & Due Dates"
        subtitle="Review instructions, starter code, grading rubrics, and deadlines; save drafts or submit final deliverables."
      />

      {/* Sub-navigation tabs matching sidebar items */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'all', label: 'All Assignments', to: '/student/assignments' },
          { key: 'create', label: 'Create / Submit Assignment', to: '/student/assignments/create' },
          { key: 'submissions', label: 'Submissions', to: '/student/assignments/submissions' },
          { key: 'rubrics', label: 'Rubrics', to: '/student/assignments/rubrics' },
          { key: 'due-dates', label: 'Due Dates', to: '/student/assignments/due-dates' }
        ].map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              currentTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {currentTab === 'rubrics' && (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{a.title} — Evaluation Rubric</h3>
                <span className="text-xs font-bold text-blue-700">Max Score: {a.maxScore} pts</span>
              </div>
              {a.rubric?.criteria?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {a.rubric.criteria.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <p className="font-bold text-slate-900">{c.criterionName}</p>
                      <p className="text-slate-600 mt-1">{c.description}</p>
                      <p className="font-mono font-bold text-blue-700 mt-1.5">{c.maxPoints} pts</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Standard 100-point technical lab & code accuracy rubric applies.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {currentTab === 'due-dates' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Assignment / Laboratory</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Late Policy</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-bold text-slate-900">{a.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.assignmentType} /></td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{new Date(a.dueDate).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.allowLateSubmissions ? `Allowed (-${a.latePenaltyPercent || 10}%)` : 'Strict Deadline'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.submissions?.[0]?.status || 'pending'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(currentTab === 'all' || currentTab === 'create' || currentTab === 'submissions') && (
      <div className="grid grid-cols-1 gap-4">
        {assignments
          .filter((a) => (currentTab === 'submissions' ? Boolean(a.submissions?.[0]) : true))
          .map((a) => {
          const mySub = a.submissions?.[0];
          return (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.assignmentType} />
                  <span className="text-xs text-slate-500">
                    Due: <strong>{new Date(a.dueDate).toLocaleDateString()}</strong> · Max Score: <strong>{a.maxScore} pts</strong>
                  </span>
                </div>
                <StatusBadge status={mySub?.status || 'pending'} />
              </div>

              <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
              <p className="text-xs text-slate-600 whitespace-pre-line">{a.instructions}</p>

              {mySub && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Submission Status: {mySub.status.toUpperCase()} (Attempt #{mySub.attemptNumber})
                    </span>
                    {mySub.score !== null && (
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        Score: {mySub.score} / {a.maxScore}
                      </span>
                    )}
                  </div>
                  {mySub.feedback && (
                    <p className="text-slate-700">
                      <strong>Instructor Feedback:</strong> {mySub.feedback}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAssignment(a);
                    setTextResponse(mySub?.textResponse || '');
                    setCodeSubmission(mySub?.codeSubmission || a.starterCode || '');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  {mySub ? 'Update / Resubmit Work' : 'Start Submission'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <ModalDialog
        isOpen={Boolean(activeAssignment)}
        onClose={() => setActiveAssignment(null)}
        title={`Submit Assignment — ${activeAssignment?.title || ''}`}
        maxWidth="max-w-2xl"
      >
        {activeAssignment && (
          <div className="space-y-4 text-xs">
            {(activeAssignment.labWorksheetChecklist || []).length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-1">
                <p className="font-bold text-blue-900">Lab Verification Checklist:</p>
                <ul className="list-disc list-inside text-slate-700">
                  {activeAssignment.labWorksheetChecklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Written Explanation / Documentation Summary
              </label>
              <textarea
                rows={3}
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                placeholder="Describe your implementation and verification steps..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Source Code / Router Configuration Script
              </label>
              <textarea
                rows={7}
                value={codeSubmission}
                onChange={(e) => setCodeSubmission(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 font-mono bg-slate-900 text-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSubmitWork(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmitWork(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                Confirm & Submit Final Work
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

export function StudentAssessmentsAndExamRunnerPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeAttemptSession, setActiveAttemptSession] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [lastSubmittedResult, setLastSubmittedResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', 'student'],
    queryFn: () => lmsApi.listAssessments()
  });

  // Countdown timer when examination is active
  useEffect(() => {
    if (!activeAttemptSession) return undefined;
    const timer = setInterval(() => {
      setRemainingSecs((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAttemptSession]);

  const handleLaunchAssessment = async (assessmentId) => {
    try {
      setLastSubmittedResult(null);
      const res = await lmsApi.startAttempt(assessmentId);
      const { attempt, questions } = res.data;
      const initialMap = {};
      for (const saved of attempt.savedAnswers || []) {
        initialMap[saved.questionId] = {
          questionId: saved.questionId,
          selectedOptionIds: saved.selectedOptionIds || [],
          textAnswer: saved.textAnswer || '',
          matchingResponse: saved.matchingResponse || {}
        };
      }
      setAnswersMap(initialMap);
      setRemainingSecs(attempt.remainingSeconds || 1800);
      setCurrentQuestionIdx(0);
      setActiveAttemptSession({ attempt, questions });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const updateAnswerForQuestion = (questionId, patch) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId, selectedOptionIds: [], textAnswer: '', matchingResponse: {} }),
        ...patch
      }
    }));
  };

  const handleAutoSave = async () => {
    if (!activeAttemptSession) return;
    try {
      await lmsApi.saveAttemptAnswers(
        activeAttemptSession.attempt.id,
        Object.values(answersMap)
      );
      addToast('Progress saved to server.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleFinalSubmit = async () => {
    if (!activeAttemptSession) return;
    try {
      const res = await lmsApi.submitAttempt(
        activeAttemptSession.attempt.id,
        Object.values(answersMap)
      );
      const submittedAttempt = res.data?.attempt;
      const maxScore = Number(res.data?.maxScore || 100);
      const score = Number(submittedAttempt?.totalScore || 0);
      const percentage =
        res.data?.percentage !== undefined
          ? Number(res.data.percentage)
          : maxScore > 0
          ? Number(((score / maxScore) * 100).toFixed(1))
          : 0;
      const passMark = Number(res.data?.passingScore || 75);
      const passed = percentage >= passMark;

      setLastSubmittedResult({
        title: activeAttemptSession.attempt?.title || 'Quiz / Examination',
        score,
        maxScore,
        percentage,
        passMark,
        passed
      });
      addToast(`Quiz submitted! Your result: ${percentage}% (${score}/${maxScore} pts).`);
      setActiveAttemptSession(null);
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  // Active Live Examination Interface
  if (activeAttemptSession) {
    const { attempt, questions } = activeAttemptSession;
    const q = questions[currentQuestionIdx];
    const currentAns = answersMap[q?.questionId] || { selectedOptionIds: [], textAnswer: '', matchingResponse: {} };
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;

    return (
      <div className="space-y-6">
        {/* Examination Top Bar */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
              Live Examination Session · Attempt #{attempt.attemptNumber}
            </span>
            <h1 className="text-lg font-bold">{attempt.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-sm font-bold text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
            </div>
            <button
              type="button"
              onClick={handleAutoSave}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
            >
              Save Progress
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              Submit Examination
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Question Navigator ({questions.length})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((item, idx) => {
                const answered = Boolean(answersMap[item.questionId]);
                return (
                  <button
                    key={item.questionId}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      currentQuestionIdx === idx
                        ? 'bg-blue-600 text-white border-blue-600'
                        : answered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Card */}
          <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            {q && (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-bold uppercase text-blue-700">
                    Question {currentQuestionIdx + 1} of {questions.length} ({q.questionType.replace(/_/g, ' ')})
                  </span>
                  <span className="text-xs font-bold text-slate-600">{q.points} Points</span>
                </div>

                <p className="text-base font-bold text-slate-900">{q.prompt}</p>

                {/* Options for Multiple Choice / True False */}
                {['multiple_choice', 'true_false', 'identification', 'fill_in_the_blank'].includes(q.questionType) && (
                  <div className="space-y-2.5">
                    {(q.options || []).map((opt) => {
                      const selected = (currentAns.selectedOptionIds || []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer text-xs font-medium ${
                            selected ? 'bg-blue-50 border-blue-500 text-blue-950' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.questionId}`}
                            checked={selected}
                            onChange={() =>
                              updateAnswerForQuestion(q.questionId, { selectedOptionIds: [opt.id] })
                            }
                          />
                          <span>{opt.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Multiple Select */}
                {q.questionType === 'multiple_select' && (
                  <div className="space-y-2.5">
                    {(q.options || []).map((opt) => {
                      const selected = (currentAns.selectedOptionIds || []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer text-xs font-medium ${
                            selected ? 'bg-blue-50 border-blue-500 text-blue-950' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const prevIds = currentAns.selectedOptionIds || [];
                              const nextIds = e.target.checked
                                ? [...prevIds, opt.id]
                                : prevIds.filter((id) => id !== opt.id);
                              updateAnswerForQuestion(q.questionId, { selectedOptionIds: nextIds });
                            }}
                          />
                          <span>{opt.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Matching */}
                {q.questionType === 'matching' && (
                  <div className="space-y-3">
                    {(q.matchingPrompts || []).map((leftItem) => (
                      <div key={leftItem} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-bold text-slate-900">{leftItem}</span>
                        <select
                          value={currentAns.matchingResponse?.[leftItem] || ''}
                          onChange={(e) =>
                            updateAnswerForQuestion(q.questionId, {
                              matchingResponse: {
                                ...(currentAns.matchingResponse || {}),
                                [leftItem]: e.target.value
                              }
                            })
                          }
                          className="px-3 py-1.5 rounded border border-slate-300 bg-white"
                        >
                          <option value="">Select matching target...</option>
                          {(q.matchingChoices || []).map((choice) => (
                            <option key={choice} value={choice}>{choice}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                    className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-40 text-xs font-semibold"
                  >
                    ← Previous Question
                  </button>
                  <button
                    type="button"
                    disabled={currentQuestionIdx >= questions.length - 1}
                    onClick={() => setCurrentQuestionIdx((i) => Math.min(questions.length - 1, i + 1))}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 text-xs font-semibold"
                  >
                    Next Question →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const assessments = data?.data?.assessments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Quizzes & Examinations"
        title="Available Assessments & Attempt History"
        subtitle="Take server-timed checkpoint quizzes and major examinations."
      />

      {lastSubmittedResult && (
        <div
          className={`p-5 rounded-2xl border-2 shadow-xs flex flex-wrap items-center justify-between gap-4 ${
            lastSubmittedResult.passed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-mono font-extrabold text-lg shrink-0 ${
                lastSubmittedResult.passed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              <span>{lastSubmittedResult.percentage}%</span>
              <span className="text-[9px] uppercase font-sans">Result</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                {lastSubmittedResult.passed ? '✓ Assessment Passed' : 'Assessment Attempt Completed'}
              </p>
              <h3 className="text-base font-extrabold">{lastSubmittedResult.title}</h3>
              <p className="text-xs mt-0.5">
                Quiz Percentage Result: <strong className="font-mono">{lastSubmittedResult.percentage}%</strong> ({lastSubmittedResult.score} / {lastSubmittedResult.maxScore} pts) · Required to Pass: <strong>{lastSubmittedResult.passMark}%</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastSubmittedResult(null)}
            className="px-3 py-1.5 rounded-lg border border-current text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.map((asmt) => {
          const attempts = asmt.attempts || [];
          const bestScore = attempts.length > 0
            ? Math.max(...attempts.map((a) => Number(a.totalScore || 0)))
            : null;
          const maxScore = Number(asmt.maxScore || 100);
          const bestPct = bestScore !== null && maxScore > 0
            ? Number(((bestScore / maxScore) * 100).toFixed(1))
            : null;

          return (
            <div key={asmt.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusBadge status={asmt.assessmentType} />
                  <span className="text-xs text-slate-500">
                    Time Limit: <strong>{asmt.timeLimitMinutes} mins</strong> · Max Attempts: <strong>{asmt.maxAttempts}</strong>
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{asmt.title}</h3>
                <p className="text-xs text-slate-600">{asmt.instructions}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-500">Attempts used: {attempts.length} / {asmt.maxAttempts}</span>
                  {bestScore !== null && (
                    <span className="ml-3 font-mono font-bold text-emerald-700">
                      Result: {bestPct}% ({bestScore} / {asmt.maxScore} pts)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchAssessment(asmt.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  {attempts.some((a) => a.status === 'in_progress') ? 'Resume Attempt' : 'Start Assessment'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudentGradesAndProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-grades'],
    queryFn: lmsApi.getPersonalGrades
  });

  if (isLoading) return <LoadingState />;

  const classes = data?.data?.classes || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Record"
        title="My Personal Gradebook & Weighted Standing"
        subtitle="View your personal weighted standing, category breakdowns, and instructor feedback."
      />

      {classes.map((cls) => (
        <div key={cls.classId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-blue-700">{cls.courseCode} · {cls.sectionCode}</span>
              <h2 className="text-lg font-bold text-slate-900">{cls.courseTitle}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Weighted Standing</span>
                <span className="text-xl font-extrabold text-blue-600">
                  {cls.standingPercentage !== null ? `${cls.standingPercentage}%` : 'In Progress'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Equivalent Grade</span>
                <span className="text-xl font-extrabold text-slate-900">
                  {cls.institutionalGrade || '—'} ({cls.letterGrade})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(cls.categoryBreakdown || {}).map((cat) => (
              <div key={cat.categoryId} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">{cat.categoryName} ({cat.weightPercent}%)</p>
                <p className="font-mono text-sm font-bold text-blue-700 mt-1">
                  {cat.percentage !== null ? `${cat.percentage}%` : 'No items yet'}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Activity / Assessment Item</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Score</th>
                  <th className="px-4 py-2.5">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(cls.grades || []).map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{g.itemTitle}</td>
                    <td className="px-4 py-2.5 capitalize">{g.sourceType}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">
                      {g.score} / {g.maxScore}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{g.feedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudentCertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: lmsApi.listCertificates
  });

  if (isLoading) return <LoadingState label="Loading completed courses, digital badges, and certificates..." />;

  const certificates = data?.data?.certificates || [];
  const avgScore =
    certificates.length > 0
      ? Math.round(
          certificates.reduce((sum, c) => sum + Number(c.finalScore || 100), 0) / certificates.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Completed Courses, Digital Badges & Verified Credentials"
        title="Completed Courses, Skill Badges & Official Certificates"
        subtitle="View all courses you have completed, download your NetAcad-style Digital Course Mastery Badges (.PNG), and download or print your official Certificates of Completion."
      />

      {/* Completed Courses & Credentials Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Completed Courses"
          value={certificates.length}
          sublabel="100% Lessons & Quizzes Passed"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Digital Skill Badges"
          value={certificates.length}
          sublabel="Downloadable PNG Badges"
          icon={Award}
          tone="amber"
        />
        <StatCard
          label="Official Certificates"
          value={certificates.length}
          sublabel="Cryptographically Verifiable"
          icon={ShieldCheck}
          tone="blue"
        />
        <StatCard
          label="Average Mastery Score"
          value={certificates.length > 0 ? `${avgScore}%` : '—'}
          sublabel="Across Completed Courses"
          icon={BookOpen}
          tone="indigo"
        />
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Award className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No Completed Courses Yet</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Read all lessons and pass the Course Completion Checkpoint Quiz in your enrolled courses to automatically unlock your Digital Skill Badge and Official Certificate.
          </p>
          <Link
            to="/student/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            Go to My Enrolled Courses →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {certificates.map((cert) => {
            const scorePct = Number(cert.finalScore || 100);
            const issuedDate = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'Verified';
            return (
              <div
                key={cert.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Completed Course Header Bar */}
                <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-bold">
                      ✓ COMPLETED COURSE · {cert.courseCode}
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold text-white">{cert.courseTitle}</h2>
                      <p className="text-[11px] text-slate-400">
                        Completed on {issuedDate} · Final Mastery Score: <strong className="text-emerald-300">{scorePct}%</strong> · Status: <strong className="uppercase text-emerald-300">{cert.status}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCourseBadgePng(cert)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Badge (.PNG)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCertificatePng(cert)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Certificate (.PNG)
                    </button>
                  </div>
                </div>

                {/* Split Grid: Left = NetAcad Digital Skill Badge Card | Right = Official Certificate Card */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left: Visual NetAcad Digital Course Mastery Badge */}
                  <div className="lg:col-span-4 bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-6 border-2 border-emerald-500/40 flex flex-col items-center justify-between text-center shadow-md">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                        Aetheria Networking Academy
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
                        ★ Verified Digital Skill Badge ★
                      </span>
                    </div>

                    {/* Visual Hexagonal Shield Emblem */}
                    <div className="my-5 w-36 h-36 rounded-3xl bg-gradient-to-br from-amber-400 via-emerald-500 to-blue-600 p-1 shadow-xl flex items-center justify-center">
                      <div className="w-full h-full bg-slate-950/95 rounded-[20px] flex flex-col items-center justify-center p-3">
                        <Award className="w-9 h-9 text-amber-400 mb-1" />
                        <span className="font-mono text-lg font-extrabold text-white tracking-tight">
                          {cert.courseCode}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-400 mt-0.5">
                          {scorePct}% SCORE
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                          100% Completed
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 w-full">
                      <p className="text-sm font-bold text-white leading-snug">{cert.courseTitle}</p>
                      <p className="text-xs text-emerald-300 font-semibold">
                        Awarded to {cert.recipientName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        Badge ID: {cert.certificateCode}
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadCourseBadgePng(cert)}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        Download Digital Badge (.PNG)
                      </button>
                    </div>
                  </div>

                  {/* Right: Official Printable & Downloadable Certificate of Course Completion */}
                  <div className="lg:col-span-8 bg-gradient-to-br from-white via-blue-50/30 to-slate-50 rounded-2xl border-2 border-blue-600/30 p-7 shadow-xs flex flex-col justify-between space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                            Aetheria Institute of Technology & Networking Academy
                          </p>
                          <h3 className="text-xl font-extrabold text-slate-900">
                            Certificate of Course Completion
                          </h3>
                        </div>
                      </div>
                      <StatusBadge status={cert.status} />
                    </div>

                    <div className="py-2 space-y-2">
                      <p className="text-xs text-slate-500">This official credential certifies that</p>
                      <p className="text-2xl font-extrabold text-slate-900">{cert.recipientName}</p>
                      <p className="text-xs text-slate-600">
                        has successfully completed all curriculum modules, practical laboratories, and course checkpoint quizzes for
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        {cert.courseCode}: {cert.courseTitle} (Final Score: {scorePct}%)
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                      <div>
                        <p>
                          Certificate Code:{' '}
                          <strong className="font-mono text-slate-900">{cert.certificateCode}</strong>
                        </p>
                        <p className="font-mono text-[10px] break-all">
                          Verification Hash: {cert.verificationHash}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadCertificatePng(cert)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Certificate (.PNG)
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                        >
                          Print / Save PDF Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STUDENT EXPANDED NAVIGATION SUB-PAGES
// (My Classes, Reports & Analytics, Students, Communication, Calendar, Settings, Help & Support)
// ============================================================================

export function StudentClassesSubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'semester';

  const { data: enrollData, isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => lmsApi.listEnrollments()
  });

  if (isLoading) return <LoadingState label="Loading class details..." />;
  const enrollments = enrollData?.data?.enrollments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="My Classes"
        title={
          activeTab === 'rosters'
            ? 'Class Rosters & Faculty Directory'
            : activeTab === 'schedule'
            ? 'Weekly Class & NetAcad Laboratory Timetable'
            : 'Current Semester Enrolled Classes'
        }
        subtitle="Manage your current semester sections, view class rosters and instructors, and check your weekly laboratory schedule."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'semester', label: 'Current Semester', to: '/student/classes/semester' },
          { key: 'rosters', label: 'Class Rosters', to: '/student/classes/rosters' },
          { key: 'schedule', label: 'Schedule / Timetable', to: '/student/classes/schedule' },
          { key: 'catalog', label: 'Course Catalog', to: '/student/catalog' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'semester' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map((en) => {
            const c = en.classSection?.courseOffering?.course;
            return (
              <div key={en.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold">
                    {c?.code} · {en.classSection?.sectionCode}
                  </span>
                  <StatusBadge status={en.status} />
                </div>
                <h3 className="text-base font-bold text-slate-900">{c?.title}</h3>
                <p className="text-xs text-slate-600">{c?.description}</p>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Credits: <strong>{c?.creditUnits || 3} Units</strong> · Room: <strong>{en.classSection?.room || 'NetAcad Lab 302'}</strong>
                  </span>
                  <Link
                    to="/student/courses"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Open Learning Studio →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'rosters' && (
        <div className="space-y-4">
          {enrollments.map((en) => {
            const c = en.classSection?.courseOffering?.course;
            return (
              <div key={en.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-blue-400 font-bold">{en.classSection?.sectionCode}</span>
                    <h3 className="text-sm font-bold">{c?.code}: {c?.title}</h3>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">Active Section Roster</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <span className="text-[10px] font-bold uppercase text-blue-700">Lead Instructor</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">Prof. Elena Vance, PhD</p>
                    <p className="text-slate-600">instructor@academy.edu</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
                    <span className="text-[10px] font-bold uppercase text-indigo-700">Teaching Assistant</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">Liam O&apos;Connor</p>
                    <p className="text-slate-600">ta@academy.edu · Lab Support</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">Enrolled Cohort</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">Maya Lin &amp; Carlos Mendoza</p>
                    <p className="text-slate-600">Section {en.classSection?.sectionCode} Peers</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Course &amp; Section</th>
                <th className="px-4 py-3">Days &amp; Time</th>
                <th className="px-4 py-3">Room / Pod</th>
                <th className="px-4 py-3">Delivery Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {enrollments.map((en, idx) => {
                const c = en.classSection?.courseOffering?.course;
                return (
                  <tr key={en.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {c?.code} — {c?.title} ({en.classSection?.sectionCode})
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-700 font-semibold">
                      {en.classSection?.scheduleText || (idx % 2 === 0 ? 'Mon / Wed 09:00 AM – 11:30 AM' : 'Tue / Thu 01:00 PM – 04:00 PM')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {en.classSection?.room || 'Cisco NetAcad Pod Lab 302'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c?.deliveryMode || 'Instructor-Led'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function StudentAnalyticsSubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'performance';

  const { data: gradesData, isLoading } = useQuery({
    queryKey: ['personal-grades'],
    queryFn: lmsApi.getPersonalGrades
  });

  const { data: certsData } = useQuery({
    queryKey: ['certificates'],
    queryFn: lmsApi.listCertificates
  });

  if (isLoading) return <LoadingState label="Loading academic analytics..." />;

  const classes = gradesData?.data?.classes || [];
  const certificates = certsData?.data?.certificates || [];

  const handleDownloadTranscriptCsv = () => {
    const rows = [
      ['Course Code', 'Course Title', 'Section', 'Weighted Standing (%)', 'Equivalent Grade', 'Letter Grade']
    ];
    for (const cls of classes) {
      rows.push([
        cls.courseCode,
        `"${cls.courseTitle}"`,
        cls.sectionCode,
        cls.standingPercentage ?? '',
        cls.institutionalGrade ?? '',
        cls.letterGrade ?? ''
      ]);
    }
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Student-Academic-Standing-Report.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Reports & Analytics"
        title="Student Performance, Statistics, Progress & Grade Export"
        subtitle="Track your quiz mastery percentages, category distributions, course completion progress, and export your personal academic transcript."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'performance', label: 'Student Performance', to: '/student/reports/performance' },
          { key: 'statistics', label: 'Class Statistics', to: '/student/reports/statistics' },
          { key: 'distribution', label: 'Grade Distribution', to: '/student/reports/distribution' },
          { key: 'progress', label: 'Progress Tracking', to: '/student/reports/progress' },
          { key: 'export', label: 'Export Grades', to: '/student/reports/export' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Enrolled Classes"
          value={classes.length}
          sublabel="Active Semester Load"
          icon={BookOpen}
          tone="blue"
        />
        <StatCard
          label="Completed Courses & Badges"
          value={certificates.length}
          sublabel="Verified Mastery Credentials"
          icon={Award}
          tone="emerald"
        />
        <StatCard
          label="Current GPA / Standing"
          value={classes[0]?.standingPercentage ? `${classes[0].standingPercentage}% (${classes[0].institutionalGrade})` : '95% (1.25)'}
          sublabel="Above 75% Passing Threshold"
          icon={ClipboardCheck}
          tone="indigo"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === 'export'
                ? 'Export Personal Gradebook & Course Completion Transcript (CSV)'
                : 'Course Standing, Category Breakdown & Mastery Progress'}
            </h3>
            <p className="text-xs text-slate-500">
              Real-time calculation across checkpoint quizzes, laboratory submissions, and examinations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTranscriptCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            Export My Grades (.CSV)
          </button>
        </div>

        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.classId} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-700">{cls.courseCode} · {cls.sectionCode}</span>
                  <h4 className="text-sm font-bold text-slate-900">{cls.courseTitle}</h4>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                  Standing: {cls.standingPercentage ?? 95}% ({cls.letterGrade || 'A'})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {Object.values(cls.categoryBreakdown || {}).map((cat) => (
                  <div key={cat.categoryId} className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">{cat.categoryName} ({cat.weightPercent}%)</span>
                    <p className="font-mono text-sm font-bold text-blue-700 mt-1">
                      {cat.percentage !== null ? `${cat.percentage}%` : 'Pending'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentDirectorySubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'profiles';

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading student academic records..." />;
  const enrollments = dashData?.data?.enrollments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Students & Academic Dossier"
        title={
          activeTab === 'attendance'
            ? 'Lecture & NetAcad Laboratory Attendance Records'
            : activeTab === 'progress'
            ? 'Individual Course & Quiz Mastery Progress'
            : activeTab === 'communication-log'
            ? 'Faculty & TA Academic Communication Log'
            : 'Student Academic Profile & Cohort Directory'
        }
        subtitle="View your official student profile, laboratory attendance, individual lesson/quiz progress, and faculty communication log."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'profiles', label: 'Student Profiles', to: '/student/students/profiles' },
          { key: 'attendance', label: 'Attendance Records', to: '/student/students/attendance' },
          { key: 'progress', label: 'Individual Progress', to: '/student/students/progress' },
          { key: 'communication-log', label: 'Communication Log', to: '/student/students/communication-log' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Student Number &amp; Program</span>
            <p className="text-sm font-bold text-slate-900 mt-1">2026-00101 · BS Information Technology</p>
            <p className="text-emerald-700 font-semibold mt-0.5">4th Year Regular Standing</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Lab &amp; Lecture Attendance</span>
            <p className="text-sm font-bold text-emerald-700 mt-1">100% Present (24 / 24 Sessions)</p>
            <p className="text-slate-600 mt-0.5">Zero absences or tardiness recorded</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Academic Adviser</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Prof. Elena Vance, PhD</p>
            <p className="text-slate-600 mt-0.5">Department of Information Technology</p>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Individual Course Progress Summary</h3>
          <div className="space-y-3">
            {enrollments.map((en) => (
              <div key={en.classId} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono font-bold text-blue-700">{en.courseCode} · {en.sectionCode}</span>
                  <p className="font-bold text-slate-900 text-sm">{en.courseTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-700">{en.progressPercentage}% Completed</span>
                  <Link to="/student/courses" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold">
                    Continue Course →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentCommunicationSubPage() {
  const { subview } = useParams();
  const { addToast } = useToast();
  const activeTab = subview || 'guardian';

  const [guardian, setGuardian] = useState({
    guardianName: 'Roberto Lin',
    relationship: 'Parent / Legal Guardian',
    phone: '+63 917 555 0198',
    email: 'roberto.lin@example.com',
    receiveGradeAlerts: true
  });

  const { data: gradesData } = useQuery({
    queryKey: ['personal-grades'],
    queryFn: lmsApi.getPersonalGrades
  });

  const allFeedbackItems = (gradesData?.data?.classes || []).flatMap((c) =>
    (c.grades || []).map((g) => ({ ...g, courseCode: c.courseCode }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Communication"
        title={activeTab === 'feedback' ? 'Instructor & TA Feedback Notes' : 'Parent / Guardian Academic Contact'}
        subtitle="Manage emergency guardian contact notifications and review consolidated faculty feedback notes."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'messages', label: 'Messages', to: '/messages' },
          { key: 'guardian', label: 'Parent / Guardian Contact', to: '/student/communication/guardian' },
          { key: 'announcements', label: 'Announcements', to: '/student/announcements' },
          { key: 'feedback', label: 'Feedback Notes', to: '/student/communication/feedback' },
          { key: 'discussions', label: 'Class Discussions', to: '/student/discussions' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'guardian' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addToast('Parent / Guardian contact preferences saved.');
          }}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-2xl text-xs shadow-xs"
        >
          <h3 className="text-sm font-bold text-slate-900">Emergency &amp; Parent / Guardian Contact Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Guardian Full Name</label>
              <input
                value={guardian.guardianName}
                onChange={(e) => setGuardian({ ...guardian, guardianName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
              <input
                value={guardian.relationship}
                onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone Number</label>
              <input
                value={guardian.phone}
                onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Guardian Email Address</label>
              <input
                type="email"
                value={guardian.email}
                onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Save Guardian Contact Details
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Instructor &amp; TA Feedback Notes</h3>
          {allFeedbackItems.length === 0 ? (
            <p className="text-slate-500">No graded feedback notes recorded yet.</p>
          ) : (
            allFeedbackItems.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{item.courseCode} — {item.itemTitle}</span>
                  <span className="font-mono font-bold text-emerald-700">{item.score} / {item.maxScore} pts</span>
                </div>
                <p className="text-slate-700">{item.feedback || 'Auto-graded checkpoint mastery verified.'}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StudentCalendarSubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'academic';

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading academic calendar & deadlines..." />;
  const upcomingAssignments = dashData?.data?.upcomingAssignments || [];
  const upcomingAssessments = dashData?.data?.upcomingAssessments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Calendar & Deadlines"
        title={
          activeTab === 'deadlines'
            ? 'Upcoming Assignment & Quiz Deadlines'
            : activeTab === 'important-dates'
            ? 'Important Institutional & NetAcad Dates'
            : 'Official Academic Calendar (AY 2026–2027)'
        }
        subtitle="Stay ahead of course milestones, laboratory submission cutoffs, and checkpoint examination windows."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'academic', label: 'Academic Calendar', to: '/student/calendar/academic' },
          { key: 'deadlines', label: 'Deadlines', to: '/student/calendar/deadlines' },
          { key: 'important-dates', label: 'Important Dates', to: '/student/calendar/important-dates' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Upcoming Assignment &amp; Lab Deadlines</h3>
          {upcomingAssignments.map((a) => (
            <div key={a.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{a.title}</p>
                <p className="text-slate-500">Due: {new Date(a.dueDate).toLocaleString()}</p>
              </div>
              <Link to="/student/assignments" className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold">
                Open Lab
              </Link>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Checkpoint Quizzes &amp; Examination Windows</h3>
          {upcomingAssessments.map((q) => (
            <div key={q.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{q.title}</p>
                <p className="text-slate-500">Closes: {new Date(q.closeDate).toLocaleDateString()} · {q.timeLimitMinutes} mins</p>
              </div>
              <Link to="/student/courses" className="px-3 py-1.5 rounded bg-indigo-600 text-white font-bold">
                Take Quiz
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentSettingsSubPage() {
  const { subview } = useParams();
  const { addToast } = useToast();
  const activeTab = subview || 'grading-scale';

  const [prefs, setPrefs] = useState({
    autoCompleteLessons: true,
    instantQuizPercentagePopup: true,
    autoIssueBadgesAndCertificates: true,
    emailDeadlineReminders: true
  });

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Student Settings"
        title={
          activeTab === 'course-settings'
            ? 'Course Learning Studio Preferences'
            : activeTab === 'notifications'
            ? 'Notification & Alert Preferences'
            : 'Official Institutional Grading Scale & Passing Policy'
        }
        subtitle="Review the institutional grading scale and customize your NetAcad learning studio preferences."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'grading-scale', label: 'Grading Scale', to: '/student/settings/grading-scale' },
          { key: 'course-settings', label: 'Course Settings', to: '/student/settings/course-settings' },
          { key: 'notifications', label: 'Notifications', to: '/student/settings/notifications' },
          { key: 'profile', label: 'Profile Management', to: '/profile' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'grading-scale' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Percentage Range</th>
                <th className="px-4 py-3">Institutional Grade</th>
                <th className="px-4 py-3">Letter Equivalent</th>
                <th className="px-4 py-3">Remarks &amp; Badge Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { range: '96% – 100%', grade: '1.00', letter: 'A+', remark: 'Passed with Highest Distinction · Badge Eligible' },
                { range: '91% – 95%', grade: '1.25', letter: 'A', remark: 'Passed with Distinction · Badge Eligible' },
                { range: '86% – 90%', grade: '1.50', letter: 'B+', remark: 'Very Good Mastery · Badge Eligible' },
                { range: '80% – 85%', grade: '1.75 – 2.25', letter: 'B', remark: 'Good Mastery · Badge Eligible' },
                { range: '75% – 79%', grade: '2.50 – 3.00', letter: 'C', remark: 'Minimum Passing Threshold (75%) · Badge Eligible' },
                { range: 'Below 75%', grade: '5.00', letter: 'F', remark: 'Requires Quiz / Coursework Retake' }
              ].map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.range}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{row.grade}</td>
                  <td className="px-4 py-3 font-bold">{row.letter}</td>
                  <td className="px-4 py-3 text-slate-600">{row.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-2xl text-xs shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Learning Studio &amp; Notification Controls</h3>
          {[
            { key: 'autoCompleteLessons', label: 'Automatically mark lessons as completed when viewed in the Course Reader' },
            { key: 'instantQuizPercentagePopup', label: 'Display instant Quiz Score Percentage card immediately upon submitting a quiz' },
            { key: 'autoIssueBadgesAndCertificates', label: 'Automatically generate Digital Skill Badge and Certificate upon 100% course completion' },
            { key: 'emailDeadlineReminders', label: 'Receive in-app and email alerts for upcoming assignment deadlines and quiz windows' }
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-semibold text-slate-800">{item.label}</span>
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) => {
                  setPrefs({ ...prefs, [item.key]: e.target.checked });
                  addToast('Student preference updated.');
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentHelpSupportSubPage() {
  const { subview } = useParams();
  const { addToast } = useToast();
  const activeTab = subview || 'user-guide';
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Help & Support"
        title={
          activeTab === 'faqs'
            ? 'Frequently Asked Questions (FAQs)'
            : activeTab === 'contact-support'
            ? 'Contact Academic & IT Technical Support'
            : 'Student User Guide: Automatic Course Completion, Quizzes & Badges'
        }
        subtitle="Everything you need to know about completing courses, passing NetAcad checkpoint quizzes, and downloading your Digital Badges and Certificates."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'user-guide', label: 'User Guide', to: '/student/help/user-guide' },
          { key: 'faqs', label: 'FAQs', to: '/student/help/faqs' },
          { key: 'contact-support', label: 'Contact IT Support', to: '/student/help/contact-support' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'user-guide' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
            <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Step 1 · Automatic Lesson Tracking</span>
            <h3 className="text-sm font-bold text-slate-900">Read Your Course Modules</h3>
            <p className="text-slate-600">
              Open <strong>Learning Materials</strong> (`/student/courses`). Every lesson you open is automatically recorded as completed—no manual button click required.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
            <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">Step 2 · Pass Checkpoint Quizzes</span>
            <h3 className="text-sm font-bold text-slate-900">Verify What You Learned</h3>
            <p className="text-slate-600">
              Take the <strong>Course Completion Quizzes</strong> using radio buttons, checkboxes, and dropdown choices. Submitting displays your exact <strong>Quiz Score Percentage</strong> (`e.g. 100%`).
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
            <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Step 3 · Download Badge &amp; Certificate</span>
            <h3 className="text-sm font-bold text-slate-900">Claim Your Credentials</h3>
            <p className="text-slate-600">
              Once all lessons are read and the course quizzes are passed (`&gt;= 75%`), the course automatically reaches <strong>100% Completed</strong> and unlocks your downloadable <strong>Digital Badge (.PNG)</strong> and <strong>Certificate (.PNG)</strong>.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="space-y-3 text-xs">
          {[
            {
              q: 'Why is my course progress at 95% after reading all lessons?',
              a: 'Just like Cisco NetAcad, a course requires passing the Course Completion Checkpoint Quiz (>= 75%) before reaching 100% completion and unlocking your Digital Badge and Certificate.'
            },
            {
              q: 'How is my Quiz Result Percentage calculated?',
              a: 'Your percentage is calculated automatically on the server as (Points Earned / Total Quiz Points) * 100 and displayed immediately after submission.'
            },
            {
              q: 'Where can I find all my completed courses, badges, and certificates?',
              a: 'Click "Completed Courses & Badges" in the left navigation sidebar (/student/certificates) to view and download all your earned PNG Badges and Certificates.'
            }
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'contact-support' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addToast('IT Support ticket submitted! Reference #AIT-SUP-2026.');
            setTicketSubject('');
            setTicketBody('');
          }}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-xl text-xs shadow-xs"
        >
          <h3 className="text-sm font-bold text-slate-900">Submit an Academic / IT Support Request</h3>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject / Lab Pod Issue</label>
            <input
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="e.g., Question about CSR1000v Lab Pod or Certificate Download"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
            <textarea
              required
              rows={4}
              value={ticketBody}
              onChange={(e) => setTicketBody(e.target.value)}
              placeholder="Describe how our IT & Faculty team can assist you..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Send Support Ticket
          </button>
        </form>
      )}
    </div>
  );
}


