const path = require('path');
const fs = require('fs');
const {
  Module,
  Lesson,
  LearningResource,
  LessonProgress,
  CourseProgress,
  ClassMembership,
  User
} = require('../models');
const env = require('../config/env');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { verifyUploadedFileSafety } = require('../middleware/upload.middleware');
const { sanitizeRichHtml } = require('../utils/sanitizer');
const { recordAudit } = require('../utils/auditLogger');
const { recalculateStudentCourseProgress } = require('../services/progress.service');
const { moduleSchema, lessonSchema } = require('../validators/schemas');

// Modules
async function listModules(req, res, next) {
  try {
    const { courseId } = req.query;
    const where = {};
    if (courseId) where.courseId = Number(courseId);
    if (req.user.primaryRole === 'student') {
      where.publicationStatus = 'published';
    }

    const modules = await Module.findAll({
      where,
      include: [
        {
          model: Lesson,
          as: 'lessons',
          include: [{ model: LearningResource, as: 'resources' }]
        },
        { model: LearningResource, as: 'resources' }
      ],
      order: [
        ['orderIndex', 'ASC'],
        [{ model: Lesson, as: 'lessons' }, 'orderIndex', 'ASC']
      ]
    });

    return res.status(200).json({ success: true, data: { modules } });
  } catch (err) {
    return next(err);
  }
}

async function createModule(req, res, next) {
  try {
    const payload = moduleSchema.parse(req.body);
    const mod = await Module.create(payload);

    await recordAudit({
      req,
      action: 'MODULE_CREATED',
      category: 'course',
      entityType: 'Module',
      entityId: mod.id,
      metadata: { courseId: mod.courseId, title: mod.title }
    });

    return res.status(201).json({ success: true, message: 'Module created.', data: { module: mod } });
  } catch (err) {
    return next(err);
  }
}

async function updateModule(req, res, next) {
  try {
    const mod = await Module.findByPk(req.params.id);
    if (!mod) throw new AppError('Module not found.', 404);
    await mod.update(req.body);
    return res.status(200).json({ success: true, message: 'Module updated.', data: { module: mod } });
  } catch (err) {
    return next(err);
  }
}

async function reorderModules(req, res, next) {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) throw new AppError('orderedIds array required.', 400);

    for (let i = 0; i < orderedIds.length; i += 1) {
      await Module.update({ orderIndex: i + 1 }, { where: { id: Number(orderedIds[i]) } });
    }

    return res.status(200).json({ success: true, message: 'Modules reordered.' });
  } catch (err) {
    return next(err);
  }
}

// Lessons
async function getLessonById(req, res, next) {
  try {
    const lesson = await Lesson.findByPk(req.params.id, {
      include: [
        { model: Module, as: 'module' },
        { model: LearningResource, as: 'resources' }
      ]
    });

    if (!lesson) throw new AppError('Lesson not found.', 404);
    if (req.user.primaryRole === 'student' && lesson.publicationStatus !== 'published') {
      throw new AppError('This lesson is not yet published.', 403, 'LESSON_UNPUBLISHED');
    }

    return res.status(200).json({ success: true, data: { lesson } });
  } catch (err) {
    return next(err);
  }
}

async function createLesson(req, res, next) {
  try {
    const payload = lessonSchema.parse(req.body);
    const sanitizedHtml = sanitizeRichHtml(payload.contentHtml);
    const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const lesson = await Lesson.create({
      ...payload,
      slug,
      contentHtml: sanitizedHtml
    });

    await recordAudit({
      req,
      action: 'LESSON_CREATED',
      category: 'course',
      entityType: 'Lesson',
      entityId: lesson.id,
      metadata: { courseId: lesson.courseId, moduleId: lesson.moduleId, title: lesson.title }
    });

    return res.status(201).json({ success: true, message: 'Lesson created.', data: { lesson } });
  } catch (err) {
    return next(err);
  }
}

async function updateLesson(req, res, next) {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) throw new AppError('Lesson not found.', 404);

    const updates = { ...req.body };
    if (updates.contentHtml) {
      updates.contentHtml = sanitizeRichHtml(updates.contentHtml);
    }

    await lesson.update(updates);
    return res.status(200).json({ success: true, message: 'Lesson updated.', data: { lesson } });
  } catch (err) {
    return next(err);
  }
}

// Learning Resources & Protected Uploads
async function listResources(req, res, next) {
  try {
    const { courseId, moduleId, lessonId } = req.query;
    const where = {};
    if (courseId) where.courseId = Number(courseId);
    if (moduleId) where.moduleId = Number(moduleId);
    if (lessonId) where.lessonId = Number(lessonId);

    const resources = await LearningResource.findAll({
      where,
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { resources } });
  } catch (err) {
    return next(err);
  }
}

async function createResource(req, res, next) {
  try {
    const {
      courseId,
      moduleId,
      lessonId,
      title,
      description,
      resourceType = 'pdf',
      externalUrl,
      isDownloadable = true
    } = req.body;

    if (!courseId || !title) {
      throw new AppError('courseId and title are required.', 400);
    }

    let fileData = {};
    if (req.file) {
      const fullPath = path.join(env.UPLOAD_DIR, req.file.filename);
      const isSafe = verifyUploadedFileSafety(fullPath);
      if (!isSafe) {
        fs.unlinkSync(fullPath);
        throw new AppError('Uploaded file failed binary safety inspection.', 400, 'UNSAFE_FILE_CONTENT');
      }
      fileData = {
        storedFilename: req.file.filename,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        fileUrl: `/api/resources/download/${req.file.filename}`
      };
    }

    const resource = await LearningResource.create({
      courseId: Number(courseId),
      moduleId: moduleId ? Number(moduleId) : null,
      lessonId: lessonId ? Number(lessonId) : null,
      title,
      description: description || null,
      resourceType,
      externalUrl: externalUrl || null,
      isDownloadable: isDownloadable !== 'false' && isDownloadable !== false,
      uploadedBy: req.user.id,
      ...fileData
    });

    return res.status(201).json({
      success: true,
      message: 'Learning resource saved.',
      data: { resource }
    });
  } catch (err) {
    return next(err);
  }
}

async function downloadResourceFile(req, res, next) {
  try {
    const resource = await LearningResource.findByPk(req.params.id);
    if (!resource || !resource.storedFilename) {
      throw new AppError('Resource file not found.', 404);
    }

    const safeName = path.basename(resource.storedFilename);
    const filePath = path.join(env.UPLOAD_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Physical file is missing on server.', 404);
    }

    return res.download(filePath, resource.originalFilename || safeName);
  } catch (err) {
    return next(err);
  }
}

// Progress Tracking & Analytics
async function updateLessonProgress(req, res, next) {
  try {
    const { classId, lessonId, status = 'completed', timeSpentSeconds = 120 } = req.body;
    await verifyClassAccess(req.user, classId, { allowStudent: true, allowInstructor: true, allowAdmin: true });

    const lesson = await Lesson.findByPk(Number(lessonId));
    if (!lesson) throw new AppError('Lesson not found.', 404);

    const [progress, created] = await LessonProgress.findOrCreate({
      where: {
        classId: Number(classId),
        lessonId: lesson.id,
        studentId: req.user.id
      },
      defaults: {
        classId: Number(classId),
        courseId: lesson.courseId,
        lessonId: lesson.id,
        studentId: req.user.id,
        status,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        lastAccessedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : null
      }
    });

    if (!created) {
      await progress.update({
        status,
        timeSpentSeconds: (progress.timeSpentSeconds || 0) + (Number(timeSpentSeconds) || 0),
        lastAccessedAt: new Date(),
        completedAt: status === 'completed' ? (progress.completedAt || new Date()) : progress.completedAt
      });
    }

    const courseProgress = await recalculateStudentCourseProgress(Number(classId), req.user.id, lesson.id);

    return res.status(200).json({
      success: true,
      message: status === 'completed' ? 'Lesson marked as completed!' : 'Lesson progress saved.',
      data: { lessonProgress: progress, courseProgress }
    });
  } catch (err) {
    return next(err);
  }
}

async function getProgressAnalytics(req, res, next) {
  try {
    const { classId } = req.query;
    if (classId) {
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true, allowTA: true, allowStudent: true });
    }

    const where = {};
    if (classId) where.classId = Number(classId);
    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    }

    const [courseProgress, lessonProgress] = await Promise.all([
      CourseProgress.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }
        ]
      }),
      LessonProgress.findAll({
        where,
        include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title', 'moduleId'] }]
      })
    ]);

    return res.status(200).json({
      success: true,
      data: { courseProgress, lessonProgress }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listModules,
  createModule,
  updateModule,
  reorderModules,
  getLessonById,
  createLesson,
  updateLesson,
  listResources,
  createResource,
  downloadResourceFile,
  updateLessonProgress,
  getProgressAnalytics
};

