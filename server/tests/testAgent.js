const { EventEmitter } = require('events');
const { Duplex } = require('stream');
const http = require('http');

/**
 * In-process Express HTTP Agent with automatic session cookie persistence.
 * Invokes Express `app(req, res)` directly in memory so integration tests run
 * deterministically even in strict sandboxes where loopback TCP sockets are restricted.
 */
class InProcessAgent {
  constructor(app) {
    this.app = app;
    this.cookies = new Map();
  }

  _buildCookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  _storeSetCookies(setCookieHeader) {
    if (!setCookieHeader) return;
    const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const raw of list) {
      const firstPart = String(raw).split(';')[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx > 0) {
        const name = firstPart.slice(0, eqIdx).trim();
        const val = firstPart.slice(eqIdx + 1).trim();
        if (val) {
          this.cookies.set(name, val);
        } else {
          this.cookies.delete(name);
        }
      }
    }
  }

  request(method, urlPath, bodyPayload = undefined) {
    const self = this;
    const customHeaders = {};
    return {
      set(headerName, headerValue) {
        customHeaders[String(headerName).toLowerCase()] = headerValue;
        return this;
      },
      send(body) {
        return self._dispatch(method, urlPath, body, customHeaders);
      },
      then(resolve, reject) {
        return self._dispatch(method, urlPath, bodyPayload, customHeaders).then(resolve, reject);
      }
    };
  }

  get(urlPath) {
    return this.request('GET', urlPath);
  }

  post(urlPath) {
    return this.request('POST', urlPath);
  }

  put(urlPath) {
    return this.request('PUT', urlPath);
  }

  delete(urlPath) {
    return this.request('DELETE', urlPath);
  }

  _dispatch(method, urlPath, bodyPayload, customHeaders = {}) {
    return new Promise((resolve, reject) => {
      const bodyStr = bodyPayload !== undefined ? JSON.stringify(bodyPayload) : '';
      const bodyBuf = Buffer.from(bodyStr, 'utf8');

      const mockSocket = new Duplex({
        read() {},
        write(chunk, enc, cb) { cb(); }
      });
      mockSocket.remoteAddress = '127.0.0.1';
      mockSocket.encrypted = false;
      const req = new http.IncomingMessage(mockSocket);
      req.method = method.toUpperCase();
      req.url = urlPath;
      req.originalUrl = urlPath;
      req.headers = {
        host: 'localhost:5000',
        'user-agent': 'vitest-inprocess-agent',
        ...customHeaders
      };
      const cookieStr = this._buildCookieHeader();
      if (cookieStr) {
        req.headers.cookie = cookieStr;
      }
      if (bodyPayload !== undefined) {
        req.headers['content-type'] = 'application/json';
        req.headers['content-length'] = String(bodyBuf.length);
      }

      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.locals = {};
      const chunks = [];

      res.setHeader = (name, value) => {
        res.headers[String(name).toLowerCase()] = value;
      };
      res.getHeader = (name) => res.headers[String(name).toLowerCase()];
      res.getHeaders = () => ({ ...res.headers });
      res.removeHeader = (name) => {
        delete res.headers[String(name).toLowerCase()];
      };
      res.writeHead = (statusCode, statusMessage, headers) => {
        res.statusCode = statusCode;
        const hdrs = typeof statusMessage === 'object' ? statusMessage : headers;
        if (hdrs) {
          for (const [k, v] of Object.entries(hdrs)) {
            res.setHeader(k, v);
          }
        }
        return res;
      };
      res.write = (chunk, encoding, cb) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding || 'utf8'));
        }
        if (typeof cb === 'function') cb();
        return true;
      };
      res.end = (chunk, encoding, cb) => {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), typeof encoding === 'string' ? encoding : 'utf8'));
        }
        this._storeSetCookies(res.headers['set-cookie']);
        const rawText = Buffer.concat(chunks).toString('utf8');
        let parsedBody = {};
        try {
          parsedBody = rawText ? JSON.parse(rawText) : {};
        } catch {
          parsedBody = {};
        }

        res.finished = true;
        res.emit('finish');
        if (typeof cb === 'function') cb();

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
          text: rawText
        });
      };

      try {
        this.app(req, res, (err) => {
          if (err) reject(err);
        });
        if (bodyBuf.length > 0) {
          req.push(bodyBuf);
        }
        req.push(null);
      } catch (err) {
        reject(err);
      }
    });
  }
}

function createAgent(app) {
  return new InProcessAgent(app);
}

module.exports = { createAgent };
