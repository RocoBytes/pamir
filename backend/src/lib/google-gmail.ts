import { google } from 'googleapis';

let gmailClient: ReturnType<typeof google.gmail> | null = null;

function getGmailClient(): ReturnType<typeof google.gmail> {
  if (gmailClient) return gmailClient;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
  return gmailClient;
}

function buildRawEmail(to: string, subject: string, html: string): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');
  return Buffer.from(message).toString('base64url');
}

export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const gmail = getGmailClient();
  const raw = buildRawEmail(to, subject, htmlBody);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}
