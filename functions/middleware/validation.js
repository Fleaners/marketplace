export function rejectUnknownBodyFields(allowedFields = []) {
  const allow = new Set(allowedFields);
  return (req, res, next) => {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return next();
    }

    const unknown = Object.keys(payload).filter((key) => !allow.has(key));
    if (unknown.length) {
      return res.status(400).json({ error: `Unknown fields are not allowed: ${unknown.join(', ')}` });
    }

    return next();
  };
}

export function requireString(field, { min = 1, max = 5000, trim = true } = {}) {
  return (req, res, next) => {
    const raw = req.body?.[field];
    const value = typeof raw === 'string' ? (trim ? raw.trim() : raw) : '';
    if (!value || value.length < min || value.length > max) {
      return res.status(400).json({ error: `${field} must be a string between ${min} and ${max} characters.` });
    }
    req.body[field] = value;
    return next();
  };
}

export function optionalString(field, { max = 5000, trim = true } = {}) {
  return (req, res, next) => {
    if (req.body?.[field] === undefined || req.body?.[field] === null) return next();
    const raw = req.body[field];
    if (typeof raw !== 'string') {
      return res.status(400).json({ error: `${field} must be a string.` });
    }
    const value = trim ? raw.trim() : raw;
    if (value.length > max) {
      return res.status(400).json({ error: `${field} exceeds maximum length.` });
    }
    req.body[field] = value;
    return next();
  };
}

export function optionalNumber(field, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  return (req, res, next) => {
    if (req.body?.[field] === undefined || req.body?.[field] === null || req.body?.[field] === '') return next();
    const value = Number(req.body[field]);
    if (!Number.isFinite(value) || value < min || value > max) {
      return res.status(400).json({ error: `${field} must be a number between ${min} and ${max}.` });
    }
    req.body[field] = value;
    return next();
  };
}

export function optionalArray(field, { maxLength = 100 } = {}) {
  return (req, res, next) => {
    if (req.body?.[field] === undefined || req.body?.[field] === null) return next();
    if (!Array.isArray(req.body[field])) {
      return res.status(400).json({ error: `${field} must be an array.` });
    }
    if (req.body[field].length > maxLength) {
      return res.status(400).json({ error: `${field} exceeds maximum item limit.` });
    }
    return next();
  };
}
