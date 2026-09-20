import http from 'http';

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING VERIFICATION TEST SUITE ---');
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

  function getMsg(body) {
    return body?.error?.message || body?.message || JSON.stringify(body);
  }

  try {
    // 0. Login as Administrator to obtain real JWT Access Token
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@kims.hospital', password: 'Kims@123' }
    });
    assert(loginRes.status === 200 && loginRes.body?.data?.accessToken, 'Admin logged in and obtained JWT access token');
    const token = loginRes.body.data.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 1. Fetch active context users to test with real database IDs
    const contextRes = await request('/users/active-context', { headers: authHeaders });
    assert(contextRes.status === 200, 'Fetched active users context');
    const users = Array.isArray(contextRes.body.data) ? contextRes.body.data : (contextRes.body.data?.users || []);
    
    const adminUser = users.find(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    const agentA = users.find(u => u.role === 'AGENT');
    const agentB = users.filter(u => u.role === 'AGENT')[1] || users.find(u => u.role === 'AGENT');
    let employeeUser = users.find(u => u.role === 'EMPLOYEE');

    console.log(`Testing with Admin: ${adminUser?.name} (${adminUser?.id})`);
    console.log(`Testing with Agent A: ${agentA?.name} (${agentA?.id})`);
    console.log(`Testing with Agent B: ${agentB?.name} (${agentB?.id})`);
    console.log(`Testing with Employee: ${employeeUser?.name || 'N/A'} (${employeeUser?.id || 'N/A'})`);

    const adminHeader = { 'x-user-id': String(adminUser.id) };
    const agentAHeader = { 'x-user-id': String(agentA.id) };
    const agentBHeader = { 'x-user-id': String(agentB.id) };

    // TEST 1: Cross-Master duplicate check - User Master email cannot be added to Employee Email Master
    const testUserEmail = adminUser.email;
    const dupRes = await request('/employee-emails', {
      method: 'POST',
      headers: adminHeader,
      body: {
        email: testUserEmail
      }
    });
    const dupMsg = getMsg(dupRes.body);
    assert(dupRes.status === 409 && dupMsg.includes('already exists in User Master'),
      `Attempting to add User Master email (${testUserEmail}) to Employee Email Master fails with 409: "${dupMsg}"`);

    // TEST 2: Create a unique Employee Email
    const uniqueEmail = `emp_${Date.now()}@kims.hospital`;
    const createEmpRes = await request('/employee-emails', {
      method: 'POST',
      headers: adminHeader,
      body: {
        email: uniqueEmail
      }
    });
    assert(createEmpRes.status === 201 && createEmpRes.body.data?.email === uniqueEmail.toLowerCase(),
      `Created new Employee Email (${uniqueEmail}) successfully`);
    const createdEmp = createEmpRes.body.data;

    // TEST 3: Attempting to re-add the same Employee Email fails with 409
    const dupEmpRes = await request('/employee-emails', {
      method: 'POST',
      headers: adminHeader,
      body: { email: uniqueEmail }
    });
    assert(dupEmpRes.status === 409, `Re-adding existing Employee Email fails with 409 Duplicate`);

    // TEST 4: Contact Search finds the newly created active Employee Email
    const searchRes = await request(`/contacts/search?q=${encodeURIComponent(uniqueEmail.split('@')[0])}`, {
      headers: adminHeader
    });
    const found = searchRes.body.data?.some(c => c.email === uniqueEmail.toLowerCase() && c.source === 'EMPLOYEE_EMAIL_MASTER');
    assert(found, `Contact search successfully found active employee email in search results`);

    // TEST 5: Deactivate Employee Email -> Disappears from Contact Search
    await request(`/employee-emails/${createdEmp.id}/status`, {
      method: 'PATCH',
      headers: adminHeader,
      body: { isActive: false }
    });
    const searchInactiveRes = await request(`/contacts/search?q=${encodeURIComponent(uniqueEmail.split('@')[0])}`, {
      headers: adminHeader
    });
    const foundAfterDeactivate = searchInactiveRes.body.data?.some(c => c.email === uniqueEmail.toLowerCase());
    assert(!foundAfterDeactivate, `Deactivated employee email is NOT returned in Contact search`);

    // Reactivate for ticket creation test
    await request(`/employee-emails/${createdEmp.id}/status`, {
      method: 'PATCH',
      headers: adminHeader,
      body: { isActive: true }
    });

    // TEST 6: RBAC check - Non-admin (Agent) cannot access Employee Email Master
    const forbiddenRes = await request('/employee-emails', {
      headers: agentAHeader
    });
    assert(forbiddenRes.status === 403, `Non-admin is forbidden (403) from accessing Employee Email Master`);

    // Fetch groups, agents, and ticket types to construct valid ticket
    const groupsRes = await request('/groups', { headers: adminHeader });
    const groups = groupsRes.body.data || [];
    
    // Find a group that contains agentA, or map agentA to groups[0]
    let agentAGroupId = null;
    for (const g of groups) {
      const agentsRes = await request(`/groups/${g.id}/agents`, { headers: adminHeader });
      const groupAgents = agentsRes.body?.data || [];
      if (groupAgents.some(a => a.id === agentA.id)) {
        agentAGroupId = g.id;
        break;
      }
    }

    if (!agentAGroupId && groups.length > 0) {
      await request(`/agents/${agentA.id}/groups`, {
        method: 'PUT',
        headers: adminHeader,
        body: { groupIds: [groups[0].id] }
      });
      agentAGroupId = groups[0].id;
    }

    const typesRes = await request('/ticket-types', { headers: adminHeader });
    const ticketTypeId = typesRes.body.data?.[0]?.id;

    // TEST 7: Create Ticket linked to Employee Email Master
    const ticketRes = await request('/tickets', {
      method: 'POST',
      headers: adminHeader,
      body: {
        subject: `Test Ticket - ${Date.now()}`,
        description: 'Testing employee email linkage and ticket delete permissions',
        priority: 'MEDIUM',
        status: 'OPEN',
        ticketTypeId,
        groupId: agentAGroupId,
        agentId: agentA.id,
        employeeEmailId: createdEmp.id
      }
    });
    console.log('Ticket create response status:', ticketRes.status, 'body:', JSON.stringify(ticketRes.body));
    assert(ticketRes.status === 201 && ticketRes.body.data?.employeeEmailId === createdEmp.id,
      `Created ticket linked to Employee Email Master (snapshot contactEmail: ${ticketRes.body.data?.contactEmail})`);
    const testTicket = ticketRes.body.data;

    // TEST 8: Ticket Edit in OPEN status is allowed
    const editOpenRes = await request(`/tickets/${testTicket?.id}`, {
      method: 'PUT',
      headers: adminHeader,
      body: {
        subject: `Test Ticket Updated - OPEN`
      }
    });
    assert(editOpenRes.status === 200 && editOpenRes.body.data?.subject.includes('Updated - OPEN'),
      `Ticket in OPEN status successfully updated`);

    // TEST 9: Close the ticket
    const closeRes = await request(`/tickets/${testTicket?.id}`, {
      method: 'PUT',
      headers: adminHeader,
      body: {
        status: 'CLOSED'
      }
    });
    assert(closeRes.status === 200 && closeRes.body.data?.status === 'CLOSED', `Ticket moved to CLOSED status`);

    // TEST 10: Editing a CLOSED ticket is REJECTED with 400
    const editClosedRes = await request(`/tickets/${testTicket?.id}`, {
      method: 'PUT',
      headers: adminHeader,
      body: {
        subject: `Should Not Update Because Ticket is Closed`
      }
    });
    const editClosedMsg = getMsg(editClosedRes.body);
    assert(editClosedRes.status === 400 && (editClosedMsg.includes('Cannot edit a closed ticket') || editClosedMsg.includes('Closed tickets cannot be edited')),
      `Attempting to edit CLOSED ticket fails with 400: "${editClosedMsg}"`);

    // TEST 11: Reopening CLOSED ticket to PENDING allows editing again
    const reopenRes = await request(`/tickets/${testTicket?.id}`, {
      method: 'PUT',
      headers: adminHeader,
      body: {
        status: 'PENDING'
      }
    });
    assert(reopenRes.status === 200 && reopenRes.body.data?.status === 'PENDING', `Ticket reopened to PENDING status`);

    const editAfterReopenRes = await request(`/tickets/${testTicket?.id}`, {
      method: 'PUT',
      headers: adminHeader,
      body: {
        subject: `Successfully Edited After Reopen`
      }
    });
    assert(editAfterReopenRes.status === 200, `Reopened ticket can now be edited again successfully`);

    // TEST 12: Ticket Delete Permissions
    // Create ticket assigned specifically to Agent A
    const agentATicketRes = await request('/tickets', {
      method: 'POST',
      headers: adminHeader,
      body: {
        subject: `Agent A Assigned Ticket - ${Date.now()}`,
        description: 'Testing Agent delete rules',
        priority: 'HIGH',
        status: 'OPEN',
        ticketTypeId,
        groupId: agentAGroupId,
        agentId: agentA.id,
        employeeEmailId: createdEmp.id
      }
    });
    const agentATicket = agentATicketRes.body.data;

    // Subtest: Agent B (not assigned) tries to delete Agent A's ticket -> MUST FAIL with 403
    // Find or simulate another agent who is NOT agentA
    const otherAgentHeader = (agentB.id !== agentA.id) ? agentBHeader : { 'x-user-id': '99999' };
    const agentBDeleteRes = await request(`/tickets/${agentATicket.id}`, {
      method: 'DELETE',
      headers: otherAgentHeader
    });
    const bDeleteMsg = getMsg(agentBDeleteRes.body);
    assert(agentBDeleteRes.status === 403,
      `Unassigned Agent is FORBIDDEN (403) from deleting another agent's ticket: "${bDeleteMsg}"`);

    // Subtest: Agent A (the assigned agent) deletes their own ticket -> MUST SUCCEED (200)
    const agentADeleteRes = await request(`/tickets/${agentATicket.id}`, {
      method: 'DELETE',
      headers: agentAHeader
    });
    assert(agentADeleteRes.status === 200, `Assigned Agent A successfully deletes their own ticket`);

    // Cleanup the first test ticket via Admin
    await request(`/tickets/${testTicket.id}`, { method: 'DELETE', headers: adminHeader });
    // Cleanup created employee email
    await request(`/employee-emails/${createdEmp.id}`, { method: 'DELETE', headers: adminHeader });

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  }

  console.log('----------------------------------------');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
