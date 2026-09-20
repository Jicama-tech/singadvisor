import { Logger } from '@nestjs/common';
import { brandedEmail, emailButton, p, strong } from './email-layout';
import type { MailService } from '../modules/mail/mail.service';
import type { MembershipsService } from '../modules/memberships/memberships.service';

/**
 * Tell the membership that something new is waiting for them.
 *
 * Headline, title and a link — never the article. A link means one copy of the
 * content, behind one gate, that goes on being gated; an emailed article can be
 * forwarded to anyone and quietly undoes the thing it was sent to announce.
 *
 * Shared by the blog and the newsletter because the rules are identical and
 * subtle enough to be worth having once: who receives it, what stops it going
 * twice, and that failing to send must never fail the publish.
 */
const logger = new Logger('MemberAnnouncement');

/** Public origin of the SPA — where a human reader is sent. Matches
 * ShareService.siteUrl rather than inventing a second convention. */
function siteUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:3200').replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type Announcement = {
  /** The line above the title — what kind of thing this is. */
  headline: string;
  title: string;
  /** One or two lines under the title. The teaser, never the body. */
  teaser?: string;
  /** Path on the public site, e.g. `/blog/some-slug`. */
  path: string;
};

/**
 * Sends to every active member, one message each.
 *
 * Individually rather than one message with everybody in the recipients field:
 * a bcc-less blast would show every member every other member's address, and
 * this membership is small enough that a loop costs nothing. If it ever is not,
 * the fix is a queue, not a shared To: line.
 *
 * Every send is best-effort — a publish must not fail because SMTP is down —
 * so this reports both how many went and how many were owed, and lets the
 * CALLER decide whether that counts as announced. See the stamping rule in
 * BlogService.announceIfNewlyGated: total failure must stay un-stamped so it
 * can be retried, or a deployment with no SMTP configured silently tells
 * nobody, once, permanently.
 */
export async function announceToMembers(
  memberships: MembershipsService,
  mail: MailService,
  announcement: Announcement,
): Promise<{ sent: number; total: number }> {
  const recipients = await memberships.activeMemberEmails();
  if (recipients.length === 0) return { sent: 0, total: 0 };

  const url = `${siteUrl()}${announcement.path}`;
  const html = brandedEmail({
    preheading: announcement.headline,
    // Without this the inbox list shows "Hi," or the headline twice. The title
    // is the one thing worth reading before opening.
    preview: announcement.title,
    body: [
      `<h1 style="margin:0 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;font-weight:700;color:#08111f;">${escapeHtml(
        announcement.title,
      )}</h1>`,
      announcement.teaser ? p(escapeHtml(announcement.teaser)) : '',
      emailButton('Read it now', url),
      p(
        `You are receiving this because you are a ${strong(
          'member',
        )}. Sign in with the Google account your membership is under to read it.`,
      ),
    ].join(''),
  });

  let sent = 0;
  for (const to of recipients) {
    const ok = await mail.sendBestEffort({
      to,
      subject: `${announcement.headline}: ${announcement.title}`,
      html,
    });
    if (ok) sent++;
  }

  if (sent < recipients.length) {
    logger.warn(
      `Announced "${announcement.title}" to ${sent}/${recipients.length} members — ` +
        'the rest failed to send (see MailService warnings).',
    );
  }
  return { sent, total: recipients.length };
}
