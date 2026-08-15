/**
 * Seeds the nine `landing-sections` rows with the copy that originally shipped
 * hardcoded in Frontend/src/app/(marketing)/page.tsx. Safe to re-run: it
 * upserts by `key`, never duplicates.
 *
 * The hero video/poster and the consultancy image point at
 * Backend/uploads/landing/ — copied there from Frontend/public/ once, with
 * their original filenames kept (these are known seed assets we control, not
 * untrusted uploads, so there's no need for the random-UUID naming real
 * uploads get). The original files stay in Frontend/public/ too — they're
 * what Frontend/src/lib/landing-defaults.ts falls back to if the Backend is
 * ever unreachable, deliberately independent of it staying up.
 *
 *   npm run seed:landing
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { LandingSectionSchema } from '../src/modules/landing/entities/landing-section.entity';

const SECTIONS: { key: string; sortOrder: number; content: Record<string, unknown> }[] = [
  {
    key: 'hero',
    sortOrder: 0,
    content: {
      eyebrow: 'Singapore · Since 2016',
      title: 'Skills that hold up',
      titleAccent: 'under a real week.',
      description:
        'We run trainings, events and consultancy engagements built around one test: does the change still hold six months later? And we are hiring the people who help us meet it.',
      primaryCtaLabel: 'Browse {count} programmes',
      primaryCtaHref: '/trainings',
      secondaryCtaLabel: 'Talk to a consultant',
      secondaryCtaHref: '/consultancy',
      videoSrc: '/uploads/landing/trainingvedio.mp4',
      posterSrc: '/uploads/landing/traing.jpg',
    },
  },
  {
    key: 'stats',
    sortOrder: 1,
    content: {
      items: [
        { value: '12,000+', label: 'People trained' },
        { value: '180+', label: 'Corporate programmes' },
        { value: '40+', label: 'Events hosted' },
        { value: '4.8/5', label: 'Average rating' },
      ],
    },
  },
  {
    key: 'pillars',
    sortOrder: 2,
    content: {
      // Order is load-bearing — positionally matched to Trainings / Events /
      // Consultancy / Careers icons+links on the Frontend.
      items: [
        {
          title: 'Trainings',
          description:
            'Practical programmes for students, corporate teams and professionals — time, money, health, emotions, leadership and communication.',
        },
        {
          title: 'Events',
          description:
            'Masterclasses, bootcamps and community evenings. Come for the sessions, stay for the people you meet.',
        },
        {
          title: 'Consultancy',
          description:
            'Learning strategy, leadership pipelines and team diagnostics — engagements that end with your team able to run it themselves.',
        },
        {
          title: 'Careers',
          description:
            'We are hiring facilitators, designers and operators who care about whether the learning actually sticks.',
        },
      ],
    },
  },
  {
    key: 'trainings',
    sortOrder: 3,
    content: {
      eyebrow: 'Trainings',
      title: 'Programmes people finish and keep using',
      description:
        'Every programme ends with something concrete you can run on Monday — not a certificate and a folder of slides.',
      ctaLabel: 'All trainings',
      ctaHref: '/trainings',
      take: 3,
    },
  },
  {
    key: 'events',
    sortOrder: 4,
    content: {
      eyebrow: 'Events',
      title: "What's coming up",
      description: 'Masterclasses, bootcamps and community evenings across Singapore.',
      ctaLabel: 'All events',
      ctaHref: '/events',
      take: 3,
    },
  },
  {
    key: 'consultancy',
    sortOrder: 5,
    content: {
      eyebrow: 'Consultancy',
      title: 'When training alone is not the answer',
      description:
        'Sometimes the problem is not a skills gap. We diagnose what is actually happening, then build the fix with you — and hand it over so it does not depend on us.',
      image: '/uploads/landing/consultancy.jpg',
      ctaLabel: 'Explore consultancy',
      ctaHref: '/consultancy',
    },
  },
  {
    key: 'careers',
    sortOrder: 6,
    content: {
      eyebrow: 'Careers',
      title: 'Come build this with us',
      description:
        'We are a small team in Singapore with more demand than capacity. If the work above sounds like something you would be good at, we would like to hear from you.',
      ctaLabel: 'All openings',
      ctaHref: '/careers',
      take: 3,
    },
  },
  {
    key: 'blog',
    sortOrder: 7,
    content: {
      eyebrow: 'Blog',
      title: "What we've learned doing the work",
      description: 'Notes from our facilitators and consultants — including the things we got wrong.',
      ctaLabel: 'All articles',
      ctaHref: '/blog',
      take: 3,
    },
  },
  {
    key: 'cta',
    sortOrder: 8,
    content: {
      title: 'Not sure which of the four you need?',
      description:
        'Tell us what is happening and we will point you to the right one — including telling you when the answer is none of them.',
      primaryCtaLabel: 'Start a conversation',
      primaryCtaHref: '/contact',
      secondaryCtaLabel: 'About SingAdvisor',
      secondaryCtaHref: '/about',
    },
  },
];

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set (check Backend/.env)');

  await mongoose.connect(uri);
  const LandingSection = mongoose.model('LandingSection', LandingSectionSchema);

  for (const section of SECTIONS) {
    await LandingSection.updateOne(
      { key: section.key },
      { $set: { sortOrder: section.sortOrder, content: section.content }, $setOnInsert: { visible: true } },
      { upsert: true },
    );
    console.log(`  seeded: ${section.key}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
