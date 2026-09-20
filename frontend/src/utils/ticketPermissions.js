/**
 * Centralized ticket business rules & permission functions for the UI.
 * Mirrors the authoritative backend rules in ticketService.js.
 */

/**
 * Ticket is editable ONLY when status is OPEN or PENDING.
 * When status is CLOSED, editing is strictly hidden/disabled.
 * Role: SUPER_ADMIN, ADMIN, AGENT can edit (when status allows).
 * EMPLOYEE cannot edit tickets.
 */
export function canEditTicket(ticket, user) {
  if (!ticket || !user) return false;

  // CLOSED tickets cannot be edited (must be reopened first)
  if (ticket.status === 'CLOSED') {
    return false;
  }

  // Only OPEN and PENDING statuses are editable
  if (ticket.status !== 'OPEN' && ticket.status !== 'PENDING') {
    return false;
  }

  // Employees cannot edit tickets
  if (user.role === 'EMPLOYEE') {
    return false;
  }

  // Admins, Super Admins, and Agents can edit
  return true;
}

/**
 * Ticket delete rule:
 * - Only the AGENT currently assigned to the ticket (ticket.agentId === user.id) can delete it.
 * - SUPER_ADMIN and ADMIN retain delete permissions.
 * - EMPLOYEE cannot delete tickets.
 */
export function canDeleteTicket(ticket, user) {
  if (!ticket || !user) return false;

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    return true;
  }

  if (user.role === 'AGENT' && ticket.agentId === user.id) {
    return true;
  }

  return false;
}

export default {
  canEditTicket,
  canDeleteTicket,
};
