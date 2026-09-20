import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TabsGuard } from '../../common/guards/tabs.guard';
import { Tabs } from '../../common/decorators/tabs.decorator';
import { SettingsService } from '../settings/settings.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappBroadcastService } from './whatsapp-broadcast.service';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';
import { SendBroadcastDto } from './dto/send-broadcast.dto';

/**
 * WhatsApp, admin only — every route on this controller.
 *
 * There is no public surface here at all, deliberately. The QR is a pairing
 * credential: anyone who scans it links THEIR phone as the sender, and anyone
 * who can read it while it is live can hijack the pairing. It is behind the
 * same guard as the rest of the admin, and it is never logged or emailed.
 *
 * The toggle lives here rather than on the Settings controller because
 * flipping it has to do two things at once — persist the flag AND open or
 * close the socket. Settings knows nothing about sockets, and WhatsApp
 * already depends on Settings; putting the toggle here keeps that dependency
 * pointing one way.
 */
@Controller('whatsapp')
// The QR is a pairing credential and the campaign routes message real
// people, so this is scoped to operators granted the WhatsApp tab rather
// than to anyone who can sign in to the admin.
@UseGuards(JwtAuthGuard, TabsGuard)
export class WhatsappController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly broadcasts: WhatsappBroadcastService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * The session as it stands. Polled by the Settings page while a QR is up,
   * because the QR rotates every twenty seconds or so and a stale one simply
   * does not scan.
   *
   * This and the five routes below it — pairing and session control — are
   * reachable with EITHER tab.
   *
   * These are the Settings > WhatsApp panel. Requiring the `whatsapp` tab for
   * them was wrong and actively broke things: an operator granted `settings`
   * saw the panel — nothing filtered the tab out of that page — asked it for
   * its status, and was told their account has no access to WhatsApp
   * messaging. A control somebody can see and cannot use.
   *
   * `settings` is already the grant that lets somebody change the SMTP
   * password and the payment keys, so pairing a phone sits comfortably inside
   * it. Sending to an AUDIENCE does not, which is why the campaign routes
   * below still ask for `whatsapp` on its own.
   */
  @Tabs('whatsapp', 'settings')
  @Get('status')
  async status() {
    const s = await this.settings.getForInternalUse();
    return { enabled: s.whatsappMessagingEnabled, ...this.whatsapp.getState() };
  }

  /** Turn it on: persist the flag, then open a session. An already-paired
   * phone reconnects silently; an unpaired one produces a QR. */
  @Tabs('whatsapp', 'settings')
  @Post('enable')
  async enable() {
    await this.settings.update({ whatsappMessagingEnabled: true }, 'admin');
    const state = await this.whatsapp.connect();
    return { enabled: true, ...state };
  }

  /**
   * Turn it off. Closes the socket but KEEPS the pairing, so switching it back
   * on does not need the phone again. Unlinking is a separate, louder action —
   * see disconnect().
   */
  @Tabs('whatsapp', 'settings')
  @Post('disable')
  async disable() {
    await this.settings.update({ whatsappMessagingEnabled: false }, 'admin');
    const state = await this.whatsapp.suspend();
    return { enabled: false, ...state };
  }

  /** Ask for a new session — the Reconnect button, and the way to get a fresh
   * QR after one has expired unscanned. */
  @Tabs('whatsapp', 'settings')
  @Post('connect')
  async connect() {
    return this.whatsapp.connect();
  }

  /** Unlink the phone and delete the local pairing. The next connect starts
   * from a new QR. */
  @Tabs('whatsapp', 'settings')
  @Post('disconnect')
  async disconnect() {
    return this.whatsapp.disconnect();
  }

  /** Prove a freshly paired phone can actually send. */
  @Tabs('whatsapp', 'settings')
  @Post('send')
  async send(@Body() dto: SendWhatsappDto) {
    await this.whatsapp.sendText(dto.phone, dto.message);
    return { ok: true };
  }

  // ── Campaigns ────────────────────────────────────────────────────────────
  //
  // `whatsapp` and nothing else. These read who the audience is and then
  // message real people on their personal phones, which is a different kind of
  // permission from configuring the site — so it is granted deliberately,
  // rather than arriving as a side effect of holding `settings`.

  @Tabs('whatsapp')
  @Get('broadcasts')
  listBroadcasts() {
    return this.broadcasts.list();
  }

  @Tabs('whatsapp')
  @Get('broadcasts/:id')
  getBroadcast(@Param('id') id: string) {
    return this.broadcasts.findOne(id);
  }

  /** Who this would reach, without sending. A marketing send cannot be taken
   * back, so the count is available while it is still a decision. */
  @Tabs('whatsapp')
  @Post('broadcasts/preview')
  preview(@Body() dto: SendBroadcastDto) {
    return this.broadcasts.preview(dto);
  }

  @Tabs('whatsapp')
  @Post('broadcasts')
  sendBroadcast(@Body() dto: SendBroadcastDto) {
    return this.broadcasts.send(dto, 'admin');
  }
}
