const crypto = require('crypto');
const env = require('../config/env');

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs an HS256 JWT token using Node's native crypto module.
 */
function signJwt(payload, expiresInMs = env.SESSION_MAX_AGE_MS) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + Math.floor(expiresInMs / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iat: nowSec,
    exp: expSec
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(signingInput)
    .digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies an HS256 JWT token and checks expiration.
 */
function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', env.SESSION_SECRET).update(signingInput).digest()
  );

  const sigBuf = Buffer.from(encodedSignature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  signJwt,
  verifyJwt
};

