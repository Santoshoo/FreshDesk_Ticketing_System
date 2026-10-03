/**
 * Centralized ticket business rules & permission functions for the UI.
 * Mirrors the authoritative backend rules in ticketService.js.
 */

/**
 * Ticket is editable across all lifecycle statuses up to and including RESOLVED:
 * (OPEN, IN_PROGRESS, PENDING, ON_HOLD, RESOLVED).
 * When status is CLOSED, editing is strictly hidden and prohibited.
 * Role: SUPER_ADMIN, ADMIN, AGENT can edit (when status allows).
 * EMPLOYEE cannot edit tickets.
 */
export function canEditTicket(a, b) {
  // Accurately resolve ticket and user regardless of invocation order
  const ticket = (a?.ticketNumber !== undefined || a?.subject !== undefined || a?.ticketTypeId !== undefined) ? a 
    : (b?.ticketNumber !== undefined || b?.subject !== undefined || b?.ticketTypeId !== undefined) ? b 
    : null;

  const user = (a?.role !== undefined || a?.roleId !== undefined) ? a 
    : (b?.role !== undefined || b?.roleId !== undefined) ? b 
    : null;

  if (!ticket || !user) return false;

  // CLOSED tickets are permanently locked and cannot be edited
  if (ticket.status === 'CLOSED') {
    return false;
  }

  // Employees cannot edit tickets
  const userRole = typeof user.role === 'object' ? user.role?.name : user.role;
  if (userRole === 'EMPLOYEE') {
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
export function canDeleteTicket(a, b) {
  // Accurately resolve ticket and user regardless of invocation order
  const ticket = (a?.ticketNumber !== undefined || a?.subject !== undefined || a?.ticketTypeId !== undefined) ? a 
    : (b?.ticketNumber !== undefined || b?.subject !== undefined || b?.ticketTypeId !== undefined) ? b 
    : null;

  const user = (a?.role !== undefined || a?.roleId !== undefined) ? a 
    : (b?.role !== undefined || b?.roleId !== undefined) ? b 
    : null;

  if (!ticket || !user) return false;

  // CLOSED tickets cannot be deleted
  if (ticket.status === 'CLOSED') {
    return false;
  }

  const userRole = typeof user.role === 'object' ? user.role?.name : user.role;

  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return true;
  }

  if (userRole === 'AGENT' && ticket.agentId === user.id) {
    return true;
  }

  return false;
}

export default {
  canEditTicket,
  canDeleteTicket,
};
