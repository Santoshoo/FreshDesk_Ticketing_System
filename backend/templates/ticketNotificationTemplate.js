/**
 * Reusable HTML and Plain-Text Email Template for KIMS ICT Service Desk
 * Strictly satisfies Requirements 4, 5, 6, 7, 11, and 19.
 */

export function generateTicketEmail({
  event, // 'CREATED' | 'CLOSED'
  recipientType, // 'ASSIGNED_AGENT' | 'GROUP'
  ticket,
  groupName,
  ticketTypeName,
  ticketUrl,
}) {
  const isCreated = event === 'CREATED';
  const isAssignedAgent = recipientType === 'ASSIGNED_AGENT';

  // Greeting and headline logic
  let headlineMessage = '';
  if (isCreated) {
    headlineMessage = isAssignedAgent
      ? 'A new ticket has been assigned to you.'
      : 'A new ticket has been assigned to your group.';
  } else {
    headlineMessage = isAssignedAgent
      ? 'The following ticket has been closed.'
      : 'The following ticket assigned to your group has been closed.';
  }

  const formattedTicketNumber = ticket.ticketNumber.startsWith('#')
    ? ticket.ticketNumber
    : `#${ticket.ticketNumber}`;

  // Plain Text Version (for email clients with text fallback)
  const plainText = [
    'Hi,',
    '',
    headlineMessage,
    '',
    `Subject: ${ticket.subject}`,
    `Group: ${groupName || 'N/A'}`,
    `Type: ${ticketTypeName || 'N/A'}`,
    `Description: ${stripHtmlToText(ticket.description)}`,
    `Ticket Number: ${formattedTicketNumber}`,
    ...(!isCreated ? [`Status: ${ticket.status || 'CLOSED'}`] : []),
    '',
    `View Ticket: ${ticketUrl}`,
    '',
    'KIMS ICT Service Desk',
  ].join('\n');

  // Professional Inline-CSS HTML Version
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ticket.subject)}</title>
  <style>
    .ticket-description-content p {
      margin: 0 0 8px 0;
    }
    .ticket-description-content p:last-child {
      margin-bottom: 0;
    }
    .ticket-description-content ul, .ticket-description-content ol {
      margin: 0 0 8px 0;
      padding-left: 20px;
    }
    .ticket-description-content li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7fb; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); border: 1px solid #e5e9f2;">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0d59cf; padding: 20px 28px; text-align: left;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                KIMS ICT Service Desk
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b;">Hi,</p>
              <p style="margin: 0 0 22px 0; font-size: 15px; color: #334155; font-weight: 500;">
                ${escapeHtml(headlineMessage)}
              </p>

              <!-- Ticket Details Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 10px 16px; font-weight: 600; color: #475569; width: 130px; vertical-align: top; border-bottom: 1px solid #e2e8f0;">
                    Subject:
                  </td>
                  <td style="padding: 10px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    ${escapeHtml(ticket.subject)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Group:
                  </td>
                  <td style="padding: 10px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
                    ${escapeHtml(groupName || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Type:
                  </td>
                  <td style="padding: 10px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
                    ${escapeHtml(ticketTypeName || 'N/A')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-weight: 600; color: #475569; vertical-align: top; border-bottom: 1px solid #e2e8f0;">
                    Description:
                  </td>
                  <td style="padding: 10px 16px; color: #334155; word-break: break-word; border-bottom: 1px solid #e2e8f0; line-height: 1.6;">
                    <div class="ticket-description-content" style="margin: 0; line-height: 1.6; color: #334155;">
                      ${formatDescriptionHtml(ticket.description)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-weight: 600; color: #475569; border-bottom: ${!isCreated ? '1px solid #e2e8f0' : 'none'};">
                    Ticket Number:
                  </td>
                  <td style="padding: 10px 16px; color: #0d59cf; font-weight: 700; border-bottom: ${!isCreated ? '1px solid #e2e8f0' : 'none'};">
                    ${escapeHtml(formattedTicketNumber)}
                  </td>
                </tr>
                ${
                  !isCreated
                    ? `<tr>
                  <td style="padding: 10px 16px; font-weight: 600; color: #475569;">
                    Status:
                  </td>
                  <td style="padding: 10px 16px; color: #b91c1c; font-weight: 700;">
                    ${escapeHtml(ticket.status || 'CLOSED')}
                  </td>
                </tr>`
                    : ''
                }
              </table>

              <!-- Call to Action Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #0d59cf;">
                    <a href="${ticketUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 11px 24px; display: inline-block; border-radius: 6px; background-color: #0d59cf; letter-spacing: 0.3px;">
                      View Ticket
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #475569;">
                KIMS ICT Service Desk
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; font-size: 11px; color: #94a3b8; text-align: center;">
              This is an automated notification from KIMS ICT Service Desk. Please do not reply directly to this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text: plainText };
}

function formatDescriptionHtml(desc) {
  if (!desc) return '';
  const trimmed = String(desc).trim();
  // Check if content contains HTML tags (e.g. from rich text editor)
  const hasHtmlTags = /<(?:p|div|span|strong|b|em|i|u|s|strike|ul|ol|li|h[1-6]|blockquote|pre|code|a|br|hr|table)\b[^>]*>/i.test(trimmed);

  if (hasHtmlTags) {
    // Sanitize any dangerous scripts, iframes, objects or event handlers while keeping safe formatting tags
    return trimmed
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/\s*on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');
  }
  // Plain text content: escape HTML entities and convert newlines to <br/>
  return escapeHtml(trimmed).replace(/\r\n|\n|\r/g, '<br/>');
}

function stripHtmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  generateTicketEmail,
};
