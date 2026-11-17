// Builds and validates user records for the repository layer.
/**
 * User Entity Model
 */

export function createUserEntity({ id, name, email, role = 'Attendee', organization = '', status = 'Active', createdAt = Date.now() }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('User display name is required.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('User email format is invalid.');
  }
  return {
    id: id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : '',
    role,
    organization: organization.trim(),
    status,
    createdAt,
    updatedAt: Date.now(),
  };
}

export function validateUser(user) {
  if (!user || !user.id || !user.name) {
    return false;
  }
  return true;
}
