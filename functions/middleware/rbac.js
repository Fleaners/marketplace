const ROLE_PERMISSIONS = {
  buyer: [],
  seller: ['products:create', 'products:update', 'products:delete', 'inventory:manage'],
  moderator: ['analytics:view'],
  support: ['analytics:view'],
  admin: ['products:create', 'products:update', 'products:delete', 'analytics:view', 'inventory:manage', 'admin:access'],
  super_admin: ['products:create', 'products:update', 'products:delete', 'analytics:view', 'inventory:manage', 'admin:access'],
};

function toRole(value) {
  return String(value || 'seller').trim().toLowerCase();
}

function toPermissionList(user) {
  if (!user) return [];
  if (Array.isArray(user.permissions)) {
    return user.permissions.map((item) => String(item || '').trim()).filter(Boolean);
  }
  const role = toRole(user.role);
  return ROLE_PERMISSIONS[role] || [];
}

export function requireRole(allowedRoles = []) {
  const normalized = new Set(allowedRoles.map((role) => toRole(role)));
  return (req, res, next) => {
    const role = toRole(req.user?.role);
    if (!normalized.has(role)) {
      return res.status(403).json({ error: 'For your security, this action requires additional access.' });
    }
    return next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = new Set(toPermissionList(req.user));
    if (!permissions.has(permission)) {
      return res.status(403).json({ error: 'For your security, this action requires additional access.' });
    }
    return next();
  };
}
