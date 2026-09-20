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
@Tabs('whatsapp')
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
   */
  @Get('status')
  async status() {
    const s = await this.settings.getForInternalUse();
    return { enabled: s.whatsappMessagingEnabled, ...this.whatsapp.getState() };
  }

  /** Turn it on: persist the flag, then open a session. An already-paired
   * phone reconnects silently; an unpaired one produces a QR. */
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
  @Post('disable')
  async disable() {
    await this.settings.update({ whatsappMessagingEnabled: false }, 'admin');
    const state = await this.whatsapp.suspend();
    return { enabled: false, ...state };
  }

  /** Ask for a new session — the Reconnect button, and the way to get a fresh
   * QR after one has expired unscanned. */
  @Post('connect')
  async connect() {
    return this.whatsapp.connect();
  }

  /** Unlink the phone and delete the local pairing. The next connect starts
   * from a new QR. */
  @Post('disconnect')
  async disconnect() {
    return this.whatsapp.disconnect();
  }

  /** Prove a freshly paired phone can actually send. */
  @Post('send')
  async send(@Body() dto: SendWhatsappDto) {
    await this.whatsapp.sendText(dto.phone, dto.message);
    return { ok: true };
  }

  // ── Campaigns ────────────────────────────────────────────────────────────

  @Get('broadcasts')
  listBroadcasts() {
    return this.broadcasts.list();
  }

  @Get('broadcasts/:id')
  getBroadcast(@Param('id') id: string) {
    return this.broadcasts.findOne(id);
  }

  /** Who this would reach, without sending. A marketing send cannot be taken
   * back, so the count is available while it is still a decision. */
  @Post('broadcasts/preview')
  preview(@Body() dto: SendBroadcastDto) {
    return this.broadcasts.preview(dto);
  }

  @Post('broadcasts')
  sendBroadcast(@Body() dto: SendBroadcastDto) {
    return this.broadcasts.send(dto, 'admin');
  }
}
