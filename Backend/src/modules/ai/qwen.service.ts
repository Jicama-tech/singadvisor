import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeSpaces } from '../../common/utils/normalize-spaces';

export interface GeneratedBlogContent {
  title: string;
  excerpt: string;
  contentHtml: string;
}

/**
 * "Generate with AI" for the Blog editor — Qwen via DashScope's
 * OpenAI-compatible endpoint, same provider/prompt shape as jicamaTech's
 * own blog generator (ported deliberately this time, not accidentally).
 * Image suggestions (Unsplash/Together/Gemini in the original) are
 * deliberately left out — the admin uploads/crops the cover image
 * themselves via the existing CroppedImageField flow.
 */
@Injectable()
export class QwenService {
  constructor(private configService: ConfigService) {}

  async generateBlogContent(topic: string): Promise<GeneratedBlogContent> {
    const apiKey = this.configService.get<string>('QWEN_API_KEY');
    if (!apiKey || apiKey === 'your-qwen-api-key') {
      throw new InternalServerErrorException(
        'QWEN_API_KEY is not configured. Add a real key to Backend/.env to enable AI blog generation.',
      );
    }

    const baseUrl =
      this.configService.get<string>('QWEN_BASE_URL') ||
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    const model = this.configService.get<string>('QWEN_MODEL') || 'qwen-plus';

    const systemPrompt = `You are a professional blog writer for a corporate training, events, and consultancy company's website. Given a topic, write a complete, well-structured blog post.

Respond with ONLY a valid JSON object (no markdown fences, no commentary) matching this exact shape:
{
  "title": "a compelling, concise blog title",
  "excerpt": "a 1-2 sentence summary for a preview card",
  "contentHtml": "the full blog post as semantic HTML using only <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote> tags — no <html>, <head>, <body>, <script>, or inline styles"
}`;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Write a blog post about: ${topic}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to reach Qwen API: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new InternalServerErrorException(`Qwen API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) {
      throw new InternalServerErrorException('Qwen API returned an unexpected response format.');
    }

    let parsed: GeneratedBlogContent;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InternalServerErrorException('Failed to parse AI-generated blog content as JSON.');
    }

    if (!parsed.title || !parsed.contentHtml) {
      throw new InternalServerErrorException('AI-generated content is missing required fields.');
    }

    return {
      title: parsed.title,
      excerpt: parsed.excerpt || '',
      contentHtml: normalizeSpaces(parsed.contentHtml),
    };
  }
}
