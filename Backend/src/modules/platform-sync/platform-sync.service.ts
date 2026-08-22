// Sending side of jicamaTech's central instance registry — reports this
// deployment's blog usage stats home on a schedule (plus once at boot, so
// a fresh deployment shows up immediately instead of waiting for the first
// cron tick). Only activates where PLATFORM_REGISTRY_URL / INSTANCE_ID /
// INSTANCE_LICENSE_KEY are all set in .env — unconfigured, this is a
// no-op. See jicamaTech's platform-registry module for the receiving side.
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from '../blog/entities/blog-post.entity';
import { Newsletter, NewsletterDocument } from '../newsletter/entities/newsletter.entity';

@Injectable()
export class PlatformSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformSyncService.name);

  constructor(
    @InjectModel(BlogPost.name)
    private readonly blogPostModel: Model<BlogPostDocument>,
    @InjectModel(Newsletter.name)
    private readonly newsletterModel: Model<NewsletterDocument>,
  ) {}

  private isConfigured(): boolean {
    return !!(
      process.env.PLATFORM_REGISTRY_URL &&
      process.env.INSTANCE_LICENSE_KEY &&
      process.env.INSTANCE_ID
    );
  }

  async onApplicationBootstrap() {
    if (!this.isConfigured()) return;
    try {
      await this.syncNow();
      this.logger.log('Initial platform sync sent.');
    } catch (err: any) {
      this.logger.warn(`Initial platform sync failed: ${err?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async scheduledSync() {
    if (!this.isConfigured()) return;
    try {
      await this.syncNow();
      this.logger.log('Scheduled platform sync sent.');
    } catch (err: any) {
      // Never let a registry outage affect this instance's own operation —
      // it just retries on the next scheduled run.
      this.logger.warn(`platform sync failed: ${err?.message}`);
    }
  }

  async syncNow(): Promise<{ skipped: true } | { skipped: false }> {
    if (!this.isConfigured()) return { skipped: true };

    const [blogCount, publishedCount, featuredCount, newsletterCount, publishedNewsletterCount] =
      await Promise.all([
        this.blogPostModel.countDocuments({}).exec(),
        this.blogPostModel.countDocuments({ published: true }).exec(),
        this.blogPostModel.countDocuments({ featured: true }).exec(),
        this.newsletterModel.countDocuments({}).exec(),
        this.newsletterModel.countDocuments({ published: true }).exec(),
      ]);

    const payload = {
      instanceId: process.env.INSTANCE_ID,
      stats: {
        blogCount,
        publishedCount,
        featuredCount,
        newsletterCount,
        publishedNewsletterCount,
      },
    };

    const res = await fetch(
      `${process.env.PLATFORM_REGISTRY_URL}/platform-registry/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-instance-license-key': process.env.INSTANCE_LICENSE_KEY as string,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`registry responded ${res.status}: ${text}`);
    }

    return { skipped: false };
  }
}
