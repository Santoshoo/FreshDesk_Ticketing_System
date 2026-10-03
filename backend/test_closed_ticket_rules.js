import { prisma } from './config/database.js';
import ticketService from './services/ticketService.js';

async function runVerification() {
  console.log('--- STARTING CLOSED TICKET IMMUTABILITY & RESOLVED EDITABILITY TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Fetch an admin user and active group/ticketType to perform service calls
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'SUPER_ADMIN' } },
    include: { role: true },
  });

  const agentUser = await prisma.user.findFirst({
    where: { role: { name: 'AGENT' } },
    include: { role: true },
  });

  const group = await prisma.group.findFirst({ where: { status: 'ACTIVE' } });
  const ticketType = await prisma.ticketType.findFirst({ where: { status: 'ACTIVE' } });

  if (!adminUser || !group || !ticketType) {
    console.error('Prerequisites not met in database.');
    process.exit(1);
  }

  let createdTicket = null;

  try {
    // 1. Create a test ticket
    createdTicket = await ticketService.createTicket(adminUser, {
      contactId: adminUser.id,
      contactSource: 'USER',
      subject: 'Test Immutability Ticket',
      ticketTypeId: ticketType.id,
      priority: 'MEDIUM',
      status: 'OPEN',
      groupId: group.id,
      agentId: agentUser ? agentUser.id : adminUser.id,
      description: 'Initial description',
    });

    assert(createdTicket.status === 'OPEN', 'Ticket created in OPEN status');

    // 2. Test editing in OPEN status
    const openUpdated = await ticketService.updateTicket(adminUser, createdTicket.id, {
      subject: 'Updated in OPEN status',
      description: 'Edited description while OPEN',
      priority: 'HIGH',
    });
    assert(openUpdated.subject === 'Updated in OPEN status', 'Editing permitted in OPEN status');

    // 3. Test editing in IN_PROGRESS status
    await ticketService.updateStatus(adminUser, createdTicket.id, 'IN_PROGRESS');
    const inProgressUpdated = await ticketService.updateTicket(adminUser, createdTicket.id, {
      subject: 'Updated in IN_PROGRESS status',
    });
    assert(inProgressUpdated.subject === 'Updated in IN_PROGRESS status', 'Editing permitted in IN_PROGRESS status');

    // 4. Test editing in RESOLVED status
    await ticketService.updateStatus(adminUser, createdTicket.id, 'RESOLVED');
    const resolvedUpdated = await ticketService.updateTicket(adminUser, createdTicket.id, {
      subject: 'Updated in RESOLVED status',
      description: 'Edited notes while in RESOLVED state',
    });
    assert(resolvedUpdated.subject === 'Updated in RESOLVED status', 'Editing permitted in RESOLVED status');

    // 5. Transition to CLOSED
    await ticketService.updateStatus(adminUser, createdTicket.id, 'CLOSED');
    const closedTicket = await prisma.ticket.findUnique({ where: { id: createdTicket.id } });
    assert(closedTicket.status === 'CLOSED', 'Ticket successfully transitioned to CLOSED');
    assert(closedTicket.closedAt !== null, 'Ticket closedAt timestamp is recorded');

    // 6. Test that updateTicket is REJECTED on CLOSED ticket
    let editClosedFailedAsExpected = false;
    try {
      await ticketService.updateTicket(adminUser, createdTicket.id, {
        subject: 'Attempted edit on closed ticket',
      });
    } catch (err) {
      editClosedFailedAsExpected = err.statusCode === 400 && err.message.includes('closed and cannot be edited');
    }
    assert(editClosedFailedAsExpected, 'updateTicket REJECTED with 400 when ticket is CLOSED');

    // 7. Test that updateStatus is REJECTED on CLOSED ticket
    let statusChangeFailedAsExpected = false;
    try {
      await ticketService.updateStatus(adminUser, createdTicket.id, 'OPEN');
    } catch (err) {
      statusChangeFailedAsExpected = err.statusCode === 400 && err.message.includes('Cannot modify the status of a closed ticket');
    }
    assert(statusChangeFailedAsExpected, 'updateStatus REJECTED with 400 when ticket is CLOSED');

    // 8. Test that updateAssignment is REJECTED on CLOSED ticket
    let assignmentFailedAsExpected = false;
    try {
      await ticketService.updateAssignment(adminUser, createdTicket.id, {
        groupId: group.id,
        agentId: adminUser.id,
      });
    } catch (err) {
      assignmentFailedAsExpected = err.statusCode === 400 && err.message.includes('Cannot reassign a closed ticket');
    }
    assert(assignmentFailedAsExpected, 'updateAssignment REJECTED with 400 when ticket is CLOSED');

    // 9. Test that addComment is REJECTED on CLOSED ticket
    let commentFailedAsExpected = false;
    try {
      await ticketService.addComment(adminUser, createdTicket.id, {
        commentType: 'REPLY',
        body: 'Post closure comment attempt',
      });
    } catch (err) {
      commentFailedAsExpected = err.statusCode === 400 && err.message.includes('closed. Adding comments or notes is disabled');
    }
    assert(commentFailedAsExpected, 'addComment REJECTED with 400 when ticket is CLOSED');

    // 10. Test that deleteTicket is REJECTED on CLOSED ticket
    let deleteFailedAsExpected = false;
    try {
      await ticketService.deleteTicket(adminUser, createdTicket.id);
    } catch (err) {
      deleteFailedAsExpected = err.statusCode === 400 && err.message.includes('Closed tickets cannot be deleted');
    }
    assert(deleteFailedAsExpected, 'deleteTicket REJECTED with 400 when ticket is CLOSED');

  } catch (err) {
    console.error('Unexpected error during test suite:', err);
    failed++;
  } finally {
    if (createdTicket?.id) {
      await prisma.ticket.delete({ where: { id: createdTicket.id } }).catch(() => {});
      console.log('Cleaned up test ticket.');
    }
    await prisma.$disconnect();
  }

  console.log(`\nTESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
