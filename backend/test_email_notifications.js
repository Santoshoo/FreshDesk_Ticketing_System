import { prisma } from './config/database.js';
import { config } from './config/env.js';
import { verifySmtpConnection, getTransporter } from './config/mail.js';
import { generateTicketEmail } from './templates/ticketNotificationTemplate.js';
import notificationService from './services/notificationService.js';
import ticketService from './services/ticketService.js';
import notificationLogRepository from './repositories/notificationLogRepository.js';

async function runEmailTests() {
  console.log('========================================================');
  console.log('KIMS ICT SERVICE DESK EMAIL NOTIFICATION TEST SUITE');
  console.log('========================================================');

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

  try {
    // ----------------------------------------------------
    // TEST 1: SMTP Connection & Credentials Verification
    // ----------------------------------------------------
    console.log('\n--- 1. Testing SMTP Credentials & Connection ---');
    console.log(`Host: ${config.smtp.host}:${config.smtp.port}`);
    console.log(`User: ${config.smtp.user}`);
    console.log(`From: ${config.smtp.from}`);
    const isSmtpConnected = await verifySmtpConnection();
    assert(isSmtpConnected, 'SMTP transporter verified successfully with Gmail host and credentials');

    // ----------------------------------------------------
    // TEST 2: Template Generator & Exact Subject Rule
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Template Formatting & Subject Rule ---');
    const mockTicket = {
      id: 230329n,
      ticketNumber: '230329',
      subject: 'Mouse issue',
      description: 'Mouse scrolling is not working at user location - Nursing station A, 4th floor main building.',
      status: 'OPEN',
    };

    const agentCreatedEmail = generateTicketEmail({
      event: 'CREATED',
      recipientType: 'ASSIGNED_AGENT',
      ticket: mockTicket,
      groupName: 'KIMS IT Infra Support',
      ticketTypeName: 'Hardware',
      ticketUrl: `${config.frontendBaseUrl}/tickets/${mockTicket.id}`,
    });

    assert(agentCreatedEmail.text.includes('A new ticket has been assigned to you.'), 'Assigned Agent Created greeting correct');
    assert(agentCreatedEmail.text.includes('Subject: Mouse issue'), 'Subject in body matches');
    assert(agentCreatedEmail.text.includes('Group: KIMS IT Infra Support'), 'Group in body matches');
    assert(agentCreatedEmail.text.includes('Type: Hardware'), 'Type in body matches');
    assert(agentCreatedEmail.text.includes('Ticket Number: #230329'), 'Ticket number in body matches');
    assert(agentCreatedEmail.text.includes(`View Ticket: ${config.frontendBaseUrl}/tickets/230329`), 'View Ticket URL matches exact route');

    const groupCreatedEmail = generateTicketEmail({
      event: 'CREATED',
      recipientType: 'GROUP',
      ticket: mockTicket,
      groupName: 'KIMS IT Infra Support',
      ticketTypeName: 'Hardware',
      ticketUrl: `${config.frontendBaseUrl}/tickets/${mockTicket.id}`,
    });
    assert(groupCreatedEmail.text.includes('A new ticket has been assigned to your group.'), 'Group Created greeting correct');

    const agentClosedEmail = generateTicketEmail({
      event: 'CLOSED',
      recipientType: 'ASSIGNED_AGENT',
      ticket: { ...mockTicket, status: 'CLOSED' },
      groupName: 'KIMS IT Infra Support',
      ticketTypeName: 'Hardware',
      ticketUrl: `${config.frontendBaseUrl}/tickets/${mockTicket.id}`,
    });
    assert(agentClosedEmail.text.includes('The following ticket has been closed.'), 'Assigned Agent Closed greeting correct');
    assert(agentClosedEmail.text.includes('Status: CLOSED'), 'Closed status included in closed template');

    // ----------------------------------------------------
    // TEST 3: Real Database Ticket Creation & Email Dispatch
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Real Ticket Creation Notification ---');

    // Fetch required entities
    const adminUser = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: { name: 'SUPER_ADMIN' } },
    });
    const agentUser = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: { name: 'AGENT' } },
    });
    const ticketType = await prisma.ticketType.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Find group where agentUser is mapped
    let group = await prisma.group.findFirst({
      where: {
        status: 'ACTIVE',
        agentGroups: {
          some: { userId: agentUser.id },
        },
      },
      include: {
        agentGroups: {
          include: { user: true },
        },
      },
    });

    if (!group) {
      // Map agentUser to the first active group
      const firstGroup = await prisma.group.findFirst({ where: { status: 'ACTIVE' } });
      await prisma.agentGroup.upsert({
        where: {
          userId_groupId: { userId: agentUser.id, groupId: firstGroup.id },
        },
        update: {},
        create: { userId: agentUser.id, groupId: firstGroup.id },
      });
      group = await prisma.group.findUnique({
        where: { id: firstGroup.id },
        include: { agentGroups: { include: { user: true } } },
      });
    }

    console.log(`Creating ticket with: Agent=${agentUser.name} (${agentUser.email}), Group=${group.name}`);

    const newTicket = await ticketService.createTicket(adminUser, {
      contactId: adminUser.id,
      contactSource: 'USER',
      subject: `Mouse issue - Auto Test ${Date.now()}`,
      ticketTypeId: ticketType.id,
      groupId: group.id,
      agentId: agentUser.id,
      description: 'Mouse scrolling is not working at user location - Nursing station A, 4th floor main building.',
      status: 'OPEN',
    });

    assert(newTicket && newTicket.id, `Ticket created successfully with number #${newTicket.ticketNumber}`);

    async function waitForLogs(ticketId, type, timeoutMs = 15000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const logs = await notificationLogRepository.getLogsByTicketId(ticketId);
        const matching = logs.filter((l) => l.notificationType === type);
        const hasAssigned = matching.some((l) => l.recipientType === 'ASSIGNED_AGENT');
        const hasGroup = matching.some((l) => l.recipientType === 'GROUP');
        if (hasAssigned && hasGroup) {
          return logs;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      return notificationLogRepository.getLogsByTicketId(ticketId);
    }

    // Wait for asynchronous email worker to finish delivery & logging
    console.log('Waiting for async email sending and MySQL logging...');
    const createLogs = await waitForLogs(newTicket.id, 'TICKET_CREATED');
    const assignedCreateLog = createLogs.find(
      (l) => l.notificationType === 'TICKET_CREATED' && l.recipientType === 'ASSIGNED_AGENT'
    );
    const groupCreateLogs = createLogs.filter(
      (l) => l.notificationType === 'TICKET_CREATED' && l.recipientType === 'GROUP'
    );

    assert(assignedCreateLog !== undefined, 'Assigned agent notification log exists in database');
    assert(assignedCreateLog?.status === 'SENT', `Assigned agent email status is SENT (recipient: ${assignedCreateLog?.recipientEmail})`);
    assert(groupCreateLogs.length > 0, `Group notification logs exist (${groupCreateLogs.length} recipient log(s))`);
    assert(groupCreateLogs.every((l) => l.status === 'SENT'), 'All group recipient logs have status SENT');

    // Verify assigned agent also in group recipients (Requirement 2 & 9: intentional dual receipt)
    const agentInGroup = groupCreateLogs.some((l) => l.recipientEmail === agentUser.email.toLowerCase());
    assert(agentInGroup, `Assigned agent (${agentUser.email}) is also included in group email recipients as required`);

    // ----------------------------------------------------
    // TEST 4: Ticket Status Update to CLOSED & Email Dispatch
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Ticket Status Update to CLOSED Notification ---');

    await ticketService.updateStatus(adminUser, newTicket.id, 'CLOSED');
    console.log('Waiting for async CLOSED email sending and MySQL logging...');
    const allLogs = await waitForLogs(newTicket.id, 'TICKET_CLOSED');
    const assignedCloseLog = allLogs.find(
      (l) => l.notificationType === 'TICKET_CLOSED' && l.recipientType === 'ASSIGNED_AGENT'
    );
    const groupCloseLogs = allLogs.filter(
      (l) => l.notificationType === 'TICKET_CLOSED' && l.recipientType === 'GROUP'
    );

    assert(assignedCloseLog !== undefined, 'Assigned agent CLOSED notification log exists in database');
    assert(assignedCloseLog?.status === 'SENT', `Assigned agent CLOSED email status is SENT`);
    assert(groupCloseLogs.length > 0, `Group CLOSED notification logs exist (${groupCloseLogs.length} recipient(s))`);
    assert(groupCloseLogs.every((l) => l.status === 'SENT'), 'All group CLOSED recipient logs have status SENT');

    // ----------------------------------------------------
    // TEST 5: Idempotency Check (Unrelated update does not trigger duplicate CLOSED email)
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Idempotency (No duplicate closed email on non-transition) ---');
    const logsCountBefore = allLogs.filter((l) => l.notificationType === 'TICKET_CLOSED').length;
    // Perform update on already closed ticket
    try {
      await ticketService.updateTicket(adminUser, newTicket.id, { description: 'Updated note' });
    } catch {
      // Expected rejection or no-op on closed ticket
    }
    await new Promise((r) => setTimeout(r, 2000));
    const logsCountAfter = (await notificationLogRepository.getLogsByTicketId(newTicket.id))
      .filter((l) => l.notificationType === 'TICKET_CLOSED').length;
    assert(logsCountBefore === logsCountAfter, 'No duplicate CLOSED emails triggered when already CLOSED');

    // Clean up test ticket and logs
    await prisma.ticket.delete({ where: { id: newTicket.id } });
    console.log('Cleaned up test ticket.');

  } catch (err) {
    console.error('Test Suite encountered error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runEmailTests();
