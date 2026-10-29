const argon2 = require('argon2');
const crypto = require('crypto');
const { User, SystemSetting } = require('../models');
const { loadUserAuthContext } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { signJwt } = require('../utils/jwt');
const env = require('../config/env');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
} = require('../validators/schemas');

const HASH_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      await recordAudit({
        req,
        actorEmail: normalizedEmail,
        action: 'AUTH_LOGIN_FAILED_UNKNOWN_USER',
        category: 'security',
        severity: 'warning'
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Check brute-force lock
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      await recordAudit({
        req,
        actorId: user.id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_BLOCKED_LOCKOUT',
        category: 'security',
        severity: 'warning'
      });
      throw new AppError(`Account temporarily locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`, 423, 'ACCOUNT_LOCKED');
    }

    if (user.status !== 'active') {
      throw new AppError(`Your account status is "${user.status}". Please contact an administrator.`, 403, 'ACCOUNT_INACTIVE');
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      const policySetting = await SystemSetting.findOne({ where: { key: 'security_policy' } });
      const maxAttempts = policySetting?.value?.maxFailedLoginAttempts || 5;
      const lockoutMins = policySetting?.value?.lockoutDurationMinutes || 15;

      const attempts = (user.failedLoginAttempts || 0) + 1;
      const lockedUntil = attempts >= maxAttempts ? new Date(Date.now() + lockoutMins * 60000) : null;

      await user.update({
        failedLoginAttempts: attempts,
        lockedUntil
      });

      await recordAudit({
        req,
        actorId: user.id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_FAILED_BAD_PASSWORD',
        category: 'security',
        severity: attempts >= maxAttempts ? 'critical' : 'warning',
        metadata: { failedAttempts: attempts, locked: Boolean(lockedUntil) }
      });

      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    await user.update({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    });

    const authUser = await loadUserAuthContext(user.id);
    req.session.userId = user.id;
    req.session.primaryRole = authUser.primaryRole;

    const accessToken = signJwt({
      sub: user.id,
      email: user.email,
      role: authUser.primaryRole
    });

    res.cookie('lms.jwt', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: env.SESSION_MAX_AGE_MS
    });

    await recordAudit({
      req,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: authUser.primaryRole,
      action: 'AUTH_LOGIN_SUCCESS',
      category: 'auth',
      severity: 'info'
    });

    return res.status(200).json({
      success: true,
      message: 'Authenticated successfully',
      data: { user: authUser, accessToken }
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.session?.userId) {
      await recordAudit({
        req,
        actorId: req.session.userId,
        action: 'AUTH_LOGOUT',
        category: 'auth',
        severity: 'info'
      });
    }

    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('lms.sid');
      res.clearCookie('lms.jwt');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (err) {
    return next(err);
  }
}

async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: req.user }
  });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });

    let demoResetToken = null;
    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      await user.update({
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000)
      });
      // In local development / test without external SMTP, return token metadata so workflow is testable end-to-end
      if (process.env.NODE_ENV !== 'production') {
        demoResetToken = rawToken;
      }
      await recordAudit({
        req,
        actorId: user.id,
        actorEmail: user.email,
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        category: 'auth',
        severity: 'info'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account matches that email, password reset instructions have been generated.',
      ...(demoResetToken ? { data: { resetToken: demoResetToken } } : {})
    });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: { passwordResetToken: hashedToken }
    });

    if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
      throw new AppError('Password reset token is invalid or has expired.', 400, 'INVALID_RESET_TOKEN');
    }

    const newHash = await argon2.hash(newPassword, HASH_OPTS);
    await user.update({
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null
    });

    await recordAudit({
      req,
      actorId: user.id,
      actorEmail: user.email,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      category: 'security',
      severity: 'info'
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in.'
    });
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await User.findByPk(req.user.id);

    const isMatch = await argon2.verify(user.passwordHash, currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400, 'INCORRECT_CURRENT_PASSWORD');
    }

    const newHash = await argon2.hash(newPassword, HASH_OPTS);
    await user.update({ passwordHash: newHash });

    await recordAudit({
      req,
      action: 'AUTH_PASSWORD_CHANGED',
      category: 'security',
      severity: 'info',
      entityType: 'User',
      entityId: user.id
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (err) {
    return next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const user = await User.findByPk(req.user.id);

    await user.update({
      firstName: payload.firstName ?? user.firstName,
      lastName: payload.lastName ?? user.lastName,
      bio: payload.bio !== undefined ? payload.bio : user.bio,
      phone: payload.phone !== undefined ? payload.phone : user.phone,
      timezone: payload.timezone ?? user.timezone,
      notificationPreferences: payload.notificationPreferences
        ? { ...user.notificationPreferences, ...payload.notificationPreferences }
        : user.notificationPreferences
    });

    const updatedAuth = await loadUserAuthContext(user.id);
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updatedAuth }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile
};

