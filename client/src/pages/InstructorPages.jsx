import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  BookOpen,
  Layers,
  Users,
  ClipboardCheck,
  Clock,
  AlertCircle,
  Plus,
  Terminal,
  Award,
  Send,
  FileDown,
  History
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

export function InstructorDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'instructor'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading instructor teaching workspace..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Faculty Teaching Workspace"
        title="Instructor Dashboard & Class Analytics"
        subtitle="Manage assigned classes, review student lab submissions, author curriculum, and monitor learning milestones."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Courses & Classes"
          value={`${m.assignedCoursesCount ?? 0} / ${m.activeClassesCount ?? 0}`}
          subtitle={`${m.enrolledStudentsCount ?? 0} enrolled learners`}
          icon={BookOpen}
          accent="blue"
        />
        <StatCard
          title="Pending Submissions"
          value={m.pendingSubmissionsCount ?? 0}
          subtitle={`${m.pendingGradingTasksCount ?? 0} total grading tasks`}
          icon={ClipboardCheck}
          accent="amber"
        />
        <StatCard
          title="Upcoming Assessments"
          value={m.upcomingAssessmentsCount ?? 0}
          subtitle={`${m.overdueActivitiesCount ?? 0} past-due activities`}
          icon={Clock}
          accent="indigo"
        />
        <StatCard
          title="Support Indicators"
          value={(d.studentsNeedingSupport || []).length}
          subtitle="Learners for optional check-in"
          icon={AlertCircle}
          accent="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Class Completion Statistics (%)</h2>
          <p className="text-xs text-slate-500 mb-4">Average curriculum progress across assigned sections</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.classCompletionStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="sectionCode" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="averageProgress" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pending Submissions & TA Flags</h2>
              <p className="text-xs text-slate-500">Recent student work awaiting instructor evaluation</p>
            </div>
            <Link
              to="/instructor/submissions"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Open Review Queue →
            </Link>
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {(d.pendingSubmissions || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No pending submissions in queue.</p>
            ) : (
              (d.pendingSubmissions || []).map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {sub.student?.firstName} {sub.student?.lastName} — {sub.assignment?.title}
                    </p>
                    {sub.flaggedForInstructorReview && (
                      <p className="text-amber-700 font-medium mt-0.5">
                        ⚑ Flagged by TA: {sub.flagReason}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Students who may need additional support */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">
          Learner Progress Indicators for Instructor Review
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Informational indicators highlighting students below the 50% curriculum milestone so instructors can offer timely academic support.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(d.studentsNeedingSupport || []).map((st, idx) => (
            <div key={idx} className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{st.studentName}</span>
                <span className="font-mono font-bold text-amber-800">{st.progressPercentage}%</span>
              </div>
              <p className="text-slate-600">{st.studentEmail}</p>
              <p className="text-[11px] text-amber-900">{st.indicatorNote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InstructorCourseStudioPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState(1);
  const [modModalOpen, setModModalOpen] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [resModalOpen, setResModalOpen] = useState(false);

  const [modForm, setModForm] = useState({ title: '', description: '', orderIndex: 4, estimatedMinutes: 90 });
  const [lessonForm, setLessonForm] = useState({
    moduleId: 1,
    title: '',
    lessonType: 'laboratory',
    summary: '',
    contentHtml: '<h2>Lesson Objectives</h2><p>Configure and verify enterprise network services.</p>',
    codeSnippet: '// Sample configuration script\nconsole.log("Ready");',
    codeLanguage: 'javascript',
    estimatedMinutes: 45,
    publicationStatus: 'published'
  });
  const [resForm, setResForm] = useState({
    title: '',
    description: '',
    resourceType: 'pdf',
    externalUrl: 'https://developer.cisco.com/'
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => lmsApi.listCourses()
  });

  const { data: courseDetail, isLoading } = useQuery({
    queryKey: ['course', selectedCourseId],
    queryFn: () => lmsApi.getCourseById(selectedCourseId),
    enabled: Boolean(selectedCourseId)
  });

  const handleCreateModule = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createModule({ ...modForm, courseId: Number(selectedCourseId) });
      addToast('Module added to course.');
      setModModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['course', selectedCourseId] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createLesson({ ...lessonForm, courseId: Number(selectedCourseId) });
      addToast('Lesson published with XSS sanitization.');
      setLessonModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['course', selectedCourseId] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('courseId', String(selectedCourseId));
      fd.append('title', resForm.title);
      fd.append('description', resForm.description);
      fd.append('resourceType', resForm.resourceType);
      fd.append('externalUrl', resForm.externalUrl);
      await lmsApi.createResource(fd);
      addToast('Learning resource attached.');
      setResModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['course', selectedCourseId] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const courses = coursesData?.data?.courses || [];
  const course = courseDetail?.data?.course;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Course & Curriculum Studio"
        title="Course Authoring, Modules, Lessons & Technical Resources"
        subtitle="Author NetAcad-style modules, rich-text lessons, code blocks, and laboratory resources."
        actions={
          <>
            <button
              type="button"
              onClick={() => setModModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"
            >
              + New Module
            </button>
            <button
              type="button"
              onClick={() => setLessonModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              + New Lesson
            </button>
            <button
              type="button"
              onClick={() => setResModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
            >
              + Attach Resource
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {courses.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCourseId(c.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border ${
              selectedCourseId === c.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.code} — {c.title}
          </button>
        ))}
      </div>

      {isLoading || !course ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          {(course.modules || []).map((mod) => (
            <div key={mod.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                  <p className="text-xs text-slate-500">{mod.description}</p>
                </div>
                <StatusBadge status={mod.publicationStatus} />
              </div>
              <div className="divide-y divide-slate-100">
                {(mod.lessons || []).map((les) => (
                  <div key={les.id} className="px-5 py-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{les.title}</span>
                      <span className="ml-2 text-slate-500 capitalize">({les.lessonType} · {les.estimatedMinutes} mins)</span>
                    </div>
                    <StatusBadge status={les.publicationStatus} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalDialog isOpen={modModalOpen} onClose={() => setModModalOpen(false)} title="Create Course Module">
        <form onSubmit={handleCreateModule} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Module Title</label>
            <input
              required
              value={modForm.title}
              onChange={(e) => setModForm({ ...modForm, title: e.target.value })}
              placeholder="Module 4: Zero-Trust Microsegmentation"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              value={modForm.description}
              onChange={(e) => setModForm({ ...modForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Save Module
          </button>
        </form>
      </ModalDialog>

      <ModalDialog isOpen={lessonModalOpen} onClose={() => setLessonModalOpen(false)} title="Author Rich-Text & Technical Lesson" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateLesson} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Target Module</label>
              <select
                value={lessonForm.moduleId}
                onChange={(e) => setLessonForm({ ...lessonForm, moduleId: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {(course?.modules || []).map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Lesson Type</label>
              <select
                value={lessonForm.lessonType}
                onChange={(e) => setLessonForm({ ...lessonForm, lessonType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="reading">Rich-Text Reading</option>
                <option value="laboratory">Technical Laboratory</option>
                <option value="coding_exercise">Coding Exercise</option>
                <option value="video">Video Lecture</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Lesson Title</label>
            <input
              required
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              placeholder="2.2 Configuring mTLS Client Certificates in Express"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Lesson Content (HTML Sanitized on Server)</label>
            <textarea
              rows={4}
              required
              value={lessonForm.contentHtml}
              onChange={(e) => setLessonForm({ ...lessonForm, contentHtml: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Technical Code Block / Router CLI Snippet</label>
            <textarea
              rows={4}
              value={lessonForm.codeSnippet}
              onChange={(e) => setLessonForm({ ...lessonForm, codeSnippet: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono bg-slate-900 text-emerald-400"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Publish Lesson
          </button>
        </form>
      </ModalDialog>

      <ModalDialog isOpen={resModalOpen} onClose={() => setResModalOpen(false)} title="Attach Learning Resource">
        <form onSubmit={handleCreateResource} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Resource Title</label>
            <input
              required
              value={resForm.title}
              onChange={(e) => setResForm({ ...resForm, title: e.target.value })}
              placeholder="Packet Tracer Lab Topology & Worksheet (.pkt / PDF)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Resource Type</label>
            <select
              value={resForm.resourceType}
              onChange={(e) => setResForm({ ...resForm, resourceType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="pdf">PDF Document</option>
              <option value="packet_tracer">Packet Tracer (.pkt)</option>
              <option value="worksheet">Laboratory Worksheet</option>
              <option value="code">Starter Source Code</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Reference / Download URL</label>
            <input
              value={resForm.externalUrl}
              onChange={(e) => setResForm({ ...resForm, externalUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Attach Resource
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function InstructorAssignmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    classId: 1,
    courseId: 1,
    title: '',
    assignmentType: 'laboratory',
    instructions: '',
    dueDate: '2026-12-05',
    maxScore: 100,
    starterCode: '// Starter code template\n',
    rubricCriteria: [
      { criterionName: 'Functional Accuracy & Protocol Compliance', maxPoints: 50 },
      { criterionName: 'Security Validation & Documentation', maxPoints: 50 }
    ]
  });

  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => lmsApi.listAssignments()
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createAssignment(form);
      addToast('Assignment and grading rubric published.');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const assignments = data?.data?.assignments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Assignments & Laboratories"
        title="Programming Exercises, Network Labs & Grading Rubrics"
        subtitle="Configure deadlines, allowed file types, starter code, and structured evaluation rubrics."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Assignment / Lab
          </button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.assignmentType} />
                  <span className="text-xs text-slate-500">
                    Due: <strong>{new Date(a.dueDate).toLocaleDateString()}</strong> · Max Score: <strong>{a.maxScore} pts</strong>
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-700">
                  {a.submissions?.length || 0} Submission(s)
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
              <p className="text-xs text-slate-600 whitespace-pre-line">{a.instructions}</p>
              {a.rubric && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-800 mb-1.5">Grading Rubric: {a.rubric.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(a.rubric.criteria || []).map((c) => (
                      <div key={c.id} className="p-2 bg-white rounded border border-slate-200">
                        <span className="font-semibold text-slate-900 block">{c.criterionName}</span>
                        <span className="text-blue-600 font-bold">{c.maxPoints} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ModalDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Assignment or Technical Lab" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Assignment Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Lab 3: Automated OSPF Neighbor Verification Script"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Activity Type</label>
              <select
                value={form.assignmentType}
                onChange={(e) => setForm({ ...form, assignmentType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="laboratory">Technical Laboratory</option>
                <option value="programming">Programming Exercise</option>
                <option value="network_config">Network Configuration (.pkt)</option>
                <option value="project_milestone">Project Milestone</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Due Date</label>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Instructions & Deliverables</label>
            <textarea
              required
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Starter Code (Optional)</label>
            <textarea
              rows={3}
              value={form.starterCode}
              onChange={(e) => setForm({ ...form, starterCode: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Publish Assignment & Rubric
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function InstructorSubmissionsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedSub, setSelectedSub] = useState(null);
  const [score, setScore] = useState(95);
  const [feedback, setFeedback] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => lmsApi.listSubmissions()
  });

  const handleGrade = async (returnForRevision = false) => {
    if (!selectedSub) return;
    try {
      const res = await lmsApi.reviewSubmission(selectedSub.id, {
        score: Number(score),
        feedback,
        returnForRevision
      });
      addToast(res.message);
      setSelectedSub(null);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const submissions = data?.data?.submissions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Submission Evaluation"
        title="Student Submission Review & Rubric Grading"
        subtitle="Inspect student code, text responses, version history, and TA preliminary flags."
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Attempt & Versions</th>
                <th className="px-4 py-3">Status & TA Flag</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {submissions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{s.student?.firstName} {s.student?.lastName}</p>
                    <p className="text-slate-500">{s.student?.studentNumber}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.assignment?.title}</td>
                  <td className="px-4 py-3">
                    Attempt #{s.attemptNumber} ({s.versions?.length || 1} v)
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={s.status} />
                      {s.flaggedForInstructorReview && (
                        <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                          ⚑ TA Flagged: {s.flagReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">
                    {s.score !== null ? `${s.score} / ${s.assignment?.maxScore || 100}` : 'Unscored'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSub(s);
                        setScore(s.score ?? 92);
                        setFeedback(s.feedback || '');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                    >
                      Inspect & Grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalDialog
        isOpen={Boolean(selectedSub)}
        onClose={() => setSelectedSub(null)}
        title={`Evaluate Submission — ${selectedSub?.student?.firstName || ''} ${selectedSub?.student?.lastName || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedSub && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">{selectedSub.assignment?.title}</p>
              <p className="text-slate-600">{selectedSub.textResponse}</p>
            </div>

            {selectedSub.codeSubmission && (
              <div>
                <p className="font-semibold text-slate-700 mb-1">Submitted Source Code / Configuration:</p>
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                  {selectedSub.codeSubmission}
                </pre>
              </div>
            )}

            {selectedSub.preliminaryFeedback && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <strong>Teaching Assistant Preliminary Note:</strong> {selectedSub.preliminaryFeedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block font-semibold mb-1">
                  Official Score (Max {selectedSub.assignment?.maxScore || 100})
                </label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Instructor Feedback</label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide constructive technical feedback..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleGrade(true)}
                className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg"
              >
                Return for Revision
              </button>
              <button
                type="button"
                onClick={() => handleGrade(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
              >
                Publish Official Grade
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

export function InstructorAssessmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [qModalOpen, setQModalOpen] = useState(false);

  const [qForm, setQForm] = useState({
    questionBankId: 1,
    courseId: 1,
    topic: 'Network Security',
    questionType: 'multiple_choice',
    difficulty: 'Medium',
    prompt: '',
    points: 10,
    correctAnswerText: '',
    options: [
      { optionText: 'Option A (Correct)', isCorrect: true },
      { optionText: 'Option B', isCorrect: false },
      { optionText: 'Option C', isCorrect: false }
    ]
  });

  const { data: banksData, isLoading } = useQuery({
    queryKey: ['question-banks'],
    queryFn: () => lmsApi.listQuestionBanks()
  });

  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => lmsApi.listAssessments()
  });

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createQuestion(qForm);
      addToast('Question added to reusable bank.');
      setQModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const banks = banksData?.data?.questionBanks || [];
  const assessments = assessmentsData?.data?.assessments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Assessment Engine"
        title="Reusable Question Banks, Quizzes & Examinations"
        subtitle="Manage objective & subjective questions across 8 question types and configure server-timed exams."
        actions={
          <button
            type="button"
            onClick={() => setQModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Question to Bank
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.map((asmt) => (
          <div key={asmt.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <StatusBadge status={asmt.assessmentType} />
              <span className="text-xs font-semibold text-slate-600">
                {asmt.timeLimitMinutes} mins · Max {asmt.maxScore} pts
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">{asmt.title}</h3>
            <p className="text-xs text-slate-600">{asmt.instructions}</p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Questions: {asmt.assessmentQuestions?.length || 0}</span>
              <span>Attempts Recorded: {asmt.attempts?.length || 0}</span>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        banks.map((bank) => (
          <div key={bank.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{bank.title}</h2>
                <p className="text-xs text-slate-500">Topic: {bank.topic}</p>
              </div>
              <span className="text-xs font-bold text-blue-700">
                {bank.questions?.length || 0} Questions
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {(bank.questions || []).map((q) => (
                <div key={q.id} className="p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 uppercase">{q.questionType.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-slate-600">{q.difficulty} · {q.points} pts</span>
                  </div>
                  <p className="font-semibold text-slate-900">{q.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <ModalDialog isOpen={qModalOpen} onClose={() => setQModalOpen(false)} title="Add Question to Question Bank">
        <form onSubmit={handleCreateQuestion} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Question Type</label>
              <select
                value={qForm.questionType}
                onChange={(e) => setQForm({ ...qForm, questionType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="multiple_choice">Multiple Choice (Radio Buttons)</option>
                <option value="true_false">True / False (Radio Buttons)</option>
                <option value="matching">Dropdown Choices / Matching</option>
                <option value="multiple_select">Multiple Select (Checkboxes)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Difficulty</label>
              <select
                value={qForm.difficulty}
                onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Question Prompt</label>
            <textarea
              required
              rows={3}
              value={qForm.prompt}
              onChange={(e) => setQForm({ ...qForm, prompt: e.target.value })}
              placeholder="Enter question stem..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Save Question
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function InstructorGradebookPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    gradeCategoryId: 3,
    studentId: 6,
    itemTitle: 'Practical Router CLI Verification',
    score: 94,
    maxScore: 100,
    reason: 'Completed live CLI routing verification in lab'
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });

  const { data: gbData, isLoading } = useQuery({
    queryKey: ['gradebook', selectedClassId],
    queryFn: () => lmsApi.getClassGradebook(selectedClassId),
    enabled: Boolean(selectedClassId)
  });

  const handleRecordManual = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.recordManualGrade(selectedClassId, manualForm);
      addToast('Grade recorded with audit revision history.');
      setManualOpen(false);
      queryClient.invalidateQueries({ queryKey: ['gradebook', selectedClassId] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleSubmitFinal = async () => {
    try {
      const res = await lmsApi.submitFinalGrades(selectedClassId);
      addToast(res.message);
      queryClient.invalidateQueries({ queryKey: ['gradebook', selectedClassId] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const classes = classesData?.data?.classes || [];
  const gb = gbData?.data || {};

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Weighted Gradebook"
        title="Class Gradebook, Category Weights & Revision Audit Trail"
        subtitle="Automated weighted calculations (Quizzes 20%, Assignments 25%, Labs 25%, Major Exam 30%) and auditable grade history."
        actions={
          <>
            <a
              href={`/api/reports?type=gradebook&classId=${selectedClassId}&format=csv`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"
            >
              <FileDown className="w-4 h-4" />
              Export CSV
            </a>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Enter / Revise Grade
            </button>
            <button
              type="button"
              onClick={handleSubmitFinal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
            >
              <Send className="w-4 h-4" />
              Submit Final Grades for Approval
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedClassId(c.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border ${
                selectedClassId === c.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {c.sectionCode}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Approval Status:</span>
          <StatusBadge status={gb.finalGradesStatus || 'in_progress'} />
        </div>
      </div>

      {/* Category Weights Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(gb.categories || []).map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-4 text-xs">
            <span className="text-slate-500 uppercase font-semibold">{cat.categoryType}</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{cat.name}</p>
            <p className="text-lg font-extrabold text-blue-600 mt-1">{cat.weightPercent}% Weight</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  {(gb.categories || []).map((cat) => (
                    <th key={cat.id} className="px-4 py-3">{cat.name} ({cat.weightPercent}%)</th>
                  ))}
                  <th className="px-4 py-3">Weighted Standing</th>
                  <th className="px-4 py-3">Equivalent</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(gb.students || []).map((st) => (
                  <tr key={st.studentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{st.studentName}</p>
                      <p className="font-mono text-slate-500">{st.studentNumber}</p>
                    </td>
                    {(gb.categories || []).map((cat) => {
                      const b = st.categoryBreakdown?.[cat.id];
                      return (
                        <td key={cat.id} className="px-4 py-3 font-mono">
                          {b?.percentage !== null && b?.percentage !== undefined
                            ? `${b.percentage}%`
                            : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 font-mono font-bold text-blue-700 text-sm">
                      {st.standingPercentage !== null ? `${st.standingPercentage}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {st.institutionalGrade ? `${st.institutionalGrade} (${st.letterGrade})` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={st.isPassing ? 'active' : 'warning'} />
                      <span className="ml-1.5 text-slate-600">{st.remarks}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auditable Grade Revision History */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Auditable Grade Revision History</h3>
        </div>
        <div className="space-y-2">
          {(gb.history || []).map((h) => (
            <div key={h.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">
                  Student #{h.studentId}: {h.previousScore ?? 'None'} → {h.newScore}
                </span>
                <p className="text-slate-600">Reason: {h.reason}</p>
              </div>
              <span className="text-slate-500">{new Date(h.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <ModalDialog isOpen={manualOpen} onClose={() => setManualOpen(false)} title="Record or Revise Grade Item">
        <form onSubmit={handleRecordManual} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Student</label>
            <select
              value={manualForm.studentId}
              onChange={(e) => setManualForm({ ...manualForm, studentId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {(gb.students || []).map((s) => (
                <option key={s.studentId} value={s.studentId}>{s.studentName} ({s.studentNumber})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Grade Category</label>
            <select
              value={manualForm.gradeCategoryId}
              onChange={(e) => setManualForm({ ...manualForm, gradeCategoryId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {(gb.categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.weightPercent}%)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Assessment / Activity Title</label>
            <input
              required
              value={manualForm.itemTitle}
              onChange={(e) => setManualForm({ ...manualForm, itemTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Score</label>
              <input
                type="number"
                required
                value={manualForm.score}
                onChange={(e) => setManualForm({ ...manualForm, score: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Max Score</label>
              <input
                type="number"
                required
                value={manualForm.maxScore}
                onChange={(e) => setManualForm({ ...manualForm, maxScore: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Mandatory Audit Reason</label>
            <input
              required
              value={manualForm.reason}
              onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
              placeholder="Explain the grade entry or revision..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Save Grade & Record Audit Log
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

