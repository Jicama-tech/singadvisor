import { Controller, Get, Header, Param } from '@nestjs/common';
import { ShareService } from './share.service';

/**
 * Crawler-facing renderer for link previews.
 *
 * The public site is a client-rendered SPA: its per-page `<meta>` tags are
 * written by react-helmet-async after the JavaScript runs, and no social
 * crawler (WhatsApp, LinkedIn, Facebook, Slack, Telegram, X…) runs
 * JavaScript. Pasting a blog or newsletter link therefore showed the one
 * static card in index.html — no cover image — for every article on the site.
 *
 * nginx routes ONLY those crawlers here (see Deployment/nginx-singadvisor.conf);
 * a human's request still goes straight to the SPA and never touches this
 * controller. The response is plain HTML carrying the real Open Graph tags
 * for that post or issue.
 *
 * Also useful by hand while debugging a preview:
 *   curl -A 'WhatsApp/2.0' https://<site>/blog/<slug>
 *   curl https://<api>/share/blog/<slug>
 */
@Controller('share')
export class ShareController {
  constructor(private readonly share: ShareService) {}

  @Get('blog/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  // Crawlers re-fetch on every share; a short cache keeps a viral link from
  // hitting Mongo on each one, while still picking up an edited cover fast.
  @Header('Cache-Control', 'public, max-age=300')
  blog(@Param('slug') slug: string): Promise<string> {
    return this.share.renderBlog(slug);
  }

  @Get('newsletter/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  newsletter(@Param('slug') slug: string): Promise<string> {
    return this.share.renderNewsletter(slug);
  }
}
