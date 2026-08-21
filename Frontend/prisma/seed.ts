import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/** Serialise a list field. Generic so agenda objects pass as readily as strings. */
const J = <T,>(items: T[]) => JSON.stringify(items);

/** Build a date relative to today so seeded events never go stale. */
const daysOut = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  console.log("Seeding SingAdvisor…");

  // Clear in FK-safe order.
  await db.blogPost.deleteMany();
  await db.registration.deleteMany();
  await db.jobApplication.deleteMany();
  await db.consultancyEnquiry.deleteMany();
  await db.contactMessage.deleteMany();
  await db.subscriber.deleteMany();
  await db.training.deleteMany();
  await db.trainer.deleteMany();
  await db.event.deleteMany();
  await db.consultancyService.deleteMany();
  await db.jobPosting.deleteMany();
  await db.adminUser.deleteMany();

  // -- Admin ---------------------------------------------------------------
  const email = process.env.ADMIN_EMAIL ?? "admin@singadvisor.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  await db.adminUser.create({
    data: {
      email,
      name: "Site Owner",
      passwordHash: await bcrypt.hash(password, 12),
      role: "owner",
    },
  });
  console.log(`  admin: ${email} / ${password}`);

  // -- Trainers ------------------------------------------------------------
  const venkat = await db.trainer.create({
    data: {
      name: "Venkat Kumar",
      title: "Lead Facilitator, Leadership & Life Skills",
      bio: "Two decades guiding professionals and students across Singapore and the region on time, money, health and emotional mastery. Known for practical frameworks people actually keep using a year later.",
      photo: "/Images/Trainer/venkat.webp",
    },
  });
  const monica = await db.trainer.create({
    data: {
      name: "Monica",
      title: "Corporate Trainer, Communication & Teams",
      bio: "Specialises in communication, trust-building and team dynamics for corporate cohorts. Designs sessions around live workplace scenarios rather than abstract theory.",
      photo: "/Images/Trainer/monicatrainer.jpeg",
    },
  });

  // -- Use case 1: Trainings ----------------------------------------------
  const trainings = [
    {
      slug: "manage-time",
      title: "Manage Time",
      summary:
        "Reclaim 8+ hours a week with a planning system that survives a chaotic calendar.",
      description:
        "Most time management advice collapses the moment a real week hits it. This session builds a planning system around how your work actually arrives — interruptions, shifting priorities and all. You will leave with a weekly operating rhythm, a triage method for incoming requests, and a way to protect deep-work blocks without becoming unreachable.",
      image: "/Images/Trainingimgae/times.webp",
      category: "Student",
      level: "Beginner",
      durationHrs: 3,
      format: "In-person",
      priceCents: 0,
      outcomes: J([
        "Run a weekly planning ritual that takes under 20 minutes",
        "Triage incoming requests with a repeatable priority filter",
        "Protect two deep-work blocks a day without going dark",
        "Cut recurring low-value commitments from your calendar",
      ]),
      modules: J([
        "Where your week actually goes: a 7-day audit",
        "The priority filter: urgent, important, and neither",
        "Designing your weekly operating rhythm",
        "Saying no without burning the relationship",
      ]),
      trainerId: venkat.id,
      featured: true,
      sortOrder: 1,
    },
    {
      slug: "manage-money",
      title: "Manage Money",
      summary:
        "Build a personal financial system — budgeting, saving and investing basics for Singapore.",
      description:
        "A grounded introduction to personal finance in the Singapore context: CPF, housing, insurance and the first steps into investing. No product pitches — this is about giving you a system you can run yourself and the confidence to evaluate advice you are given.",
      image: "/Images/Trainingimgae/mony.webp",
      category: "Student",
      level: "Beginner",
      durationHrs: 3,
      format: "In-person",
      priceCents: 0,
      outcomes: J([
        "Build a monthly budget you will actually maintain",
        "Understand CPF, housing and insurance interactions",
        "Set an emergency fund target matched to your situation",
        "Evaluate an investment product before you buy it",
      ]),
      modules: J([
        "Mapping where your money goes today",
        "The Singapore essentials: CPF, HDB, insurance",
        "Emergency funds and debt priority",
        "First principles of investing",
      ]),
      trainerId: venkat.id,
      featured: true,
      sortOrder: 2,
    },
    {
      slug: "manage-health",
      title: "Manage Health",
      summary:
        "Sustainable habits for energy, sleep and movement that fit a working week.",
      description:
        "Health advice usually assumes free time you do not have. This session focuses on the smallest set of changes that move the needle on energy and sleep, and on habit design that survives a busy quarter — including what to do when the routine breaks.",
      image: "/Images/Trainingimgae/healthfr.webp",
      category: "Student",
      level: "Beginner",
      durationHrs: 2.5,
      format: "In-person",
      priceCents: 0,
      outcomes: J([
        "Identify the two habits with the highest payoff for you",
        "Build a sleep routine that survives late work nights",
        "Fit meaningful movement into a full calendar",
        "Restart a broken habit without abandoning it",
      ]),
      modules: J([
        "Energy auditing: what actually drains you",
        "Sleep as the foundation habit",
        "Movement that fits, not movement that impresses",
        "Habit repair when the routine breaks",
      ]),
      trainerId: venkat.id,
      sortOrder: 3,
    },
    {
      slug: "manage-emotion",
      title: "Manage Emotion",
      summary:
        "Recognise, name and regulate emotional responses under real pressure.",
      description:
        "Emotional regulation is a skill, not a temperament. This session covers what happens physiologically under stress, how to interrupt an escalating response, and how to have the difficult conversation afterwards rather than avoiding it.",
      image: "/Images/Trainingimgae/emot.webp",
      category: "Student",
      level: "Beginner",
      durationHrs: 3,
      format: "In-person",
      priceCents: 0,
      outcomes: J([
        "Name what you are feeling with useful precision",
        "Interrupt an escalating stress response in the moment",
        "Recover from a difficult interaction rather than replaying it",
        "Hold a hard conversation without it becoming a conflict",
      ]),
      modules: J([
        "What stress does to your thinking",
        "Naming emotions precisely enough to act",
        "In-the-moment regulation techniques",
        "The repair conversation",
      ]),
      trainerId: venkat.id,
      sortOrder: 4,
    },
    {
      slug: "build-trust-in-teams",
      title: "Build Trust in Teams",
      summary:
        "Diagnose where trust is breaking in your team and rebuild it deliberately.",
      description:
        "Trust is usually discussed as a feeling; this session treats it as a set of observable behaviours you can diagnose and change. Teams map their own trust gaps against a working model, then commit to specific behavioural changes with a follow-up checkpoint.",
      image: "/Images/Trainingimgae/trusttem.webp",
      category: "Corporate",
      level: "Intermediate",
      durationHrs: 6,
      format: "In-person",
      priceCents: 68000,
      outcomes: J([
        "Diagnose which of the four trust dimensions is failing",
        "Give and receive feedback without triggering defensiveness",
        "Run a blameless retrospective on a real failure",
        "Set team working agreements that hold up",
      ]),
      modules: J([
        "The four dimensions of team trust",
        "Diagnosing your team's actual gap",
        "Feedback that lands",
        "Blameless retrospectives in practice",
        "Working agreements and follow-through",
      ]),
      trainerId: monica.id,
      featured: true,
      sortOrder: 5,
    },
    {
      slug: "leadership-skills",
      title: "Leadership Skills",
      summary:
        "The transition from doing the work to being accountable for it.",
      description:
        "Built for newly promoted managers and senior individual contributors moving into leadership. Covers delegation that does not become abdication, running one-to-ones people find useful, and making decisions with incomplete information.",
      image: "/Images/Trainingimgae/led.webp",
      category: "Corporate",
      level: "Intermediate",
      durationHrs: 8,
      format: "Hybrid",
      priceCents: 95000,
      outcomes: J([
        "Delegate work without losing the thread on quality",
        "Run one-to-ones your reports find genuinely useful",
        "Make and communicate decisions under uncertainty",
        "Give developmental feedback that changes behaviour",
      ]),
      modules: J([
        "From contributor to leader: what actually changes",
        "Delegation and the abdication trap",
        "One-to-ones that are not status updates",
        "Deciding with incomplete information",
        "Developing the people you lead",
      ]),
      trainerId: monica.id,
      featured: true,
      sortOrder: 6,
    },
    {
      slug: "communication-skills",
      title: "Communication Skills",
      summary:
        "Be understood the first time — in writing, in meetings and under pressure.",
      description:
        "Practical communication for the workplace: structuring a message so the point lands early, running a meeting that reaches a decision, and staying clear when the stakes rise. Heavy on live practice with feedback.",
      image: "/Images/Trainingimgae/comunicat.jpg",
      category: "Corporate",
      level: "All levels",
      durationHrs: 6,
      format: "In-person",
      priceCents: 68000,
      outcomes: J([
        "Structure any message so the point lands in the first line",
        "Run meetings that end in a decision, not a follow-up",
        "Adapt your register to the audience without losing substance",
        "Stay clear and specific in high-stakes conversations",
      ]),
      modules: J([
        "Point first: structuring for busy readers",
        "Meetings that reach decisions",
        "Reading and adapting to your audience",
        "High-stakes conversations",
      ]),
      trainerId: monica.id,
      sortOrder: 7,
    },
    {
      slug: "career-transitions",
      title: "Navigating Career Transitions",
      summary:
        "Change roles, industries or countries with a plan rather than a leap.",
      description:
        "For professionals considering a significant move. Covers assessing transferable skills honestly, positioning a non-linear history, building a network before you need it, and negotiating a package in the Singapore market.",
      image: "/Images/Trainingimgae/career.jpg",
      category: "Professional",
      level: "Advanced",
      durationHrs: 4,
      format: "Online",
      priceCents: 32000,
      outcomes: J([
        "Assess which of your skills genuinely transfer",
        "Position a non-linear career history as a strength",
        "Build a network before you need to use it",
        "Negotiate a package with market context",
      ]),
      modules: J([
        "Honest transferable-skill assessment",
        "Positioning a non-linear history",
        "Networking before the need",
        "Negotiation in the Singapore market",
      ]),
      trainerId: venkat.id,
      sortOrder: 8,
    },
  ];

  for (const t of trainings) await db.training.create({ data: t });
  console.log(`  ${trainings.length} trainings`);

  // -- Use case 2: Events --------------------------------------------------
  const events = [
    {
      slug: "client-appreciation-2024-07",
      title: "Client Appreciation Evening",
      summary:
        "An evening with our client community — talks, dinner and open networking.",
      description:
        "Our mid-year gathering brought together clients, trainers and partners for a set of short talks followed by dinner and open networking. Held at Tampines Grande with three speakers on financial planning, family wellbeing and leadership.",
      image: "/Images/Events/Aug-25 (1).jpeg",
      venue: "3 Tampines Grande",
      address: "3 Tampines Grande, Singapore 528733",
      startsAt: daysOut(-200, 18, 30),
      endsAt: daysOut(-200, 21, 30),
      capacity: 120,
      speakers: J(["SG. SivaKumar", "Venkat Kumar", "Akila Manikandan"]),
      agenda: J([
        { time: "6:30 pm", title: "Registration and welcome drinks" },
        { time: "7:00 pm", title: "Opening address" },
        { time: "7:20 pm", title: "Talks: planning, wellbeing, leadership" },
        { time: "8:15 pm", title: "Dinner and networking" },
      ]),
      priceCents: 0,
    },
    {
      slug: "client-appreciation-2024-09",
      title: "Client Appreciation Evening — September",
      summary:
        "The September edition of our client evening, with a focus on family financial planning.",
      description:
        "The September gathering focused on family financial planning and intergenerational wealth, followed by dinner and networking with the wider SingAdvisor community.",
      image: "/Images/Events/Sep-29 (1).jpeg",
      venue: "3 Tampines Grande",
      address: "3 Tampines Grande, Singapore 528733",
      startsAt: daysOut(-140, 18, 30),
      endsAt: daysOut(-140, 21, 30),
      capacity: 120,
      speakers: J(["Venkat Kumar", "Akila Manikandan", "Dakshaini"]),
      agenda: J([
        { time: "6:30 pm", title: "Registration" },
        { time: "7:00 pm", title: "Family financial planning" },
        { time: "7:45 pm", title: "Panel and audience questions" },
        { time: "8:30 pm", title: "Dinner and networking" },
      ]),
      priceCents: 0,
    },
    {
      slug: "leadership-masterclass",
      title: "Leadership Masterclass: Deciding Under Uncertainty",
      summary:
        "A half-day intensive on making and communicating decisions without complete information.",
      description:
        "A hands-on masterclass for managers and senior contributors. Participants work through real decision scenarios in small groups, then practise communicating a decision to a sceptical audience. Limited to 40 places to keep the practice sessions workable.",
      image: "/Images/Trainingimgae/led.webp",
      venue: "SingAdvisor Learning Studio",
      address: "3 Tampines Grande, Singapore 528733",
      startsAt: daysOut(21, 9, 0),
      endsAt: daysOut(21, 13, 0),
      capacity: 40,
      speakers: J(["Monica", "Venkat Kumar"]),
      agenda: J([
        { time: "9:00 am", title: "Registration and coffee" },
        { time: "9:30 am", title: "The anatomy of a hard decision" },
        { time: "10:30 am", title: "Small-group decision scenarios" },
        { time: "11:45 am", title: "Communicating to a sceptical room" },
        { time: "12:45 pm", title: "Close and lunch" },
      ]),
      priceCents: 18000,
      featured: true,
    },
    {
      slug: "student-life-skills-bootcamp",
      title: "Student Life Skills Bootcamp",
      summary:
        "A free full-day bootcamp for students on time, money, health and emotions.",
      description:
        "Our flagship free programme for students, condensing the four life-skills modules into a single day. Includes lunch and a workbook. Places are limited and go quickly — register early.",
      image: "/Images/Trainingimgae/traing.jpg",
      venue: "SingAdvisor Learning Studio",
      address: "3 Tampines Grande, Singapore 528733",
      startsAt: daysOut(38, 9, 30),
      endsAt: daysOut(38, 17, 0),
      capacity: 80,
      speakers: J(["Venkat Kumar", "Monica"]),
      agenda: J([
        { time: "9:30 am", title: "Welcome and orientation" },
        { time: "10:00 am", title: "Manage Time" },
        { time: "11:30 am", title: "Manage Money" },
        { time: "1:00 pm", title: "Lunch" },
        { time: "2:00 pm", title: "Manage Health" },
        { time: "3:30 pm", title: "Manage Emotion" },
        { time: "4:45 pm", title: "Close and next steps" },
      ]),
      priceCents: 0,
      featured: true,
    },
    {
      slug: "corporate-wellbeing-forum",
      title: "Corporate Wellbeing Forum",
      summary:
        "HR and people leaders on what workplace wellbeing programmes actually change.",
      description:
        "A candid half-day forum for HR and people leaders. Rather than another survey of wellbeing trends, this forum focuses on which interventions produced measurable change in participating organisations — and which quietly did not.",
      image: "/Images/Trainingimgae/healthfr.webp",
      venue: "Marina Bay Conference Centre",
      address: "10 Bayfront Avenue, Singapore 018956",
      startsAt: daysOut(66, 13, 30),
      endsAt: daysOut(66, 18, 0),
      capacity: 150,
      speakers: J(["Monica", "Akila Manikandan"]),
      agenda: J([
        { time: "1:30 pm", title: "Registration" },
        { time: "2:00 pm", title: "What the data actually shows" },
        { time: "3:00 pm", title: "Case studies from three organisations" },
        { time: "4:15 pm", title: "Panel: measuring what matters" },
        { time: "5:15 pm", title: "Networking" },
      ]),
      priceCents: 12000,
    },
  ];

  for (const e of events) await db.event.create({ data: e });
  console.log(`  ${events.length} events`);

  // -- Use case 3: Consultancy --------------------------------------------
  const services = [
    {
      slug: "learning-strategy",
      title: "Learning & Development Strategy",
      summary:
        "Turn scattered training spend into a capability plan tied to business outcomes.",
      description:
        "Many organisations buy training reactively and cannot say what it bought them. We audit current L&D spend and coverage, map it against the capabilities the business plan actually requires, and hand back a prioritised roadmap with a measurement approach you can run without us.",
      image: "/Images/Trainingimgae/consultancy.jpg",
      icon: "compass",
      engagement: "Project-based",
      deliverables: J([
        "Current-state L&D audit across spend, coverage and outcomes",
        "Capability gap analysis against your business plan",
        "18-month prioritised learning roadmap",
        "Measurement framework and reporting templates",
      ]),
      idealFor: J([
        "Organisations of 50+ with fragmented training spend",
        "HR teams asked to justify L&D budget",
        "Companies entering a growth or restructuring phase",
      ]),
      sortOrder: 1,
    },
    {
      slug: "leadership-development",
      title: "Leadership Pipeline Design",
      summary:
        "Identify and develop the leaders you will need in two years, not the ones you needed last year.",
      description:
        "We work with your executive team to define what leadership actually needs to look like in your context, assess the current bench against it, and build a development track for high-potential staff — including succession planning for the roles where a departure would genuinely hurt.",
      image: "/Images/Trainingimgae/led.webp",
      icon: "users",
      engagement: "Retainer",
      deliverables: J([
        "Leadership competency model specific to your organisation",
        "Bench-strength assessment of current and emerging leaders",
        "Individual development plans for high-potential staff",
        "Succession map for business-critical roles",
        "Quarterly progress reviews",
      ]),
      idealFor: J([
        "Founder-led companies professionalising their management",
        "Organisations with concentrated key-person risk",
        "Teams scaling past 100 people",
      ]),
      sortOrder: 2,
    },
    {
      slug: "team-effectiveness",
      title: "Team Effectiveness Diagnostics",
      summary:
        "Find out why a specific team is underperforming — and fix the actual cause.",
      description:
        "A focused diagnostic for a team that is visibly struggling. Confidential interviews, observation of real working sessions and a structured survey produce a diagnosis of the underlying cause — which is rarely the one everyone assumed — plus a concrete intervention plan and a follow-up review.",
      image: "/Images/Trainingimgae/trusttem.webp",
      icon: "activity",
      engagement: "Project-based",
      deliverables: J([
        "Confidential one-to-one interviews with every team member",
        "Observation of live working sessions",
        "Diagnostic report with root-cause analysis",
        "Facilitated team session to agree the way forward",
        "90-day follow-up review",
      ]),
      idealFor: J([
        "Teams with high attrition or visible conflict",
        "Newly merged or restructured teams",
        "High-stakes teams missing delivery targets",
      ]),
      sortOrder: 3,
    },
    {
      slug: "workplace-wellbeing",
      title: "Workplace Wellbeing Programmes",
      summary:
        "Design a wellbeing programme staff use, with metrics that hold up to scrutiny.",
      description:
        "Wellbeing initiatives often measure attendance rather than effect. We design a programme around what your workforce data and staff feedback actually indicate, build in measurement from the start, and train internal champions so the programme continues after the engagement ends.",
      image: "/Images/Trainingimgae/health.jpg",
      icon: "heart",
      engagement: "Advisory",
      deliverables: J([
        "Workforce wellbeing baseline assessment",
        "Programme design matched to your findings",
        "Internal champion training and enablement materials",
        "Outcome measurement framework",
      ]),
      idealFor: J([
        "Organisations with rising absence or burnout signals",
        "HR teams rebooting a programme that lost momentum",
        "Companies with wellbeing commitments to report on",
      ]),
      sortOrder: 4,
    },
  ];

  for (const s of services) await db.consultancyService.create({ data: s });
  console.log(`  ${services.length} consultancy services`);

  // -- Use case 4: Careers -------------------------------------------------
  const jobs = [
    {
      slug: "senior-corporate-trainer",
      title: "Senior Corporate Trainer",
      department: "Delivery",
      location: "Singapore",
      employment: "Full-time",
      workMode: "Hybrid",
      experience: "5-8 years",
      salaryMin: 84000,
      salaryMax: 120000,
      summary:
        "Lead corporate leadership and communication programmes for our enterprise clients.",
      description:
        "You will own delivery for a portfolio of corporate clients — running leadership, communication and team-effectiveness programmes, and adapting our material to each client's context. This is a delivery-first role with real input into programme design; roughly 60% facilitation, 40% design and client work.",
      requirements: J([
        "5+ years facilitating corporate learning programmes",
        "Track record with senior audiences, including C-suite",
        "Experience adapting standard material to client context",
        "Strong written English for proposals and client reports",
        "Willingness to travel occasionally within Southeast Asia",
      ]),
      benefits: J([
        "Hybrid working with delivery days on site",
        "Annual professional development budget",
        "Comprehensive health and dental coverage",
        "Performance bonus tied to client outcomes",
      ]),
      closesAt: daysOut(45, 23, 59),
    },
    {
      slug: "learning-experience-designer",
      title: "Learning Experience Designer",
      department: "Product",
      location: "Singapore",
      employment: "Full-time",
      workMode: "Remote",
      experience: "3-5 years",
      salaryMin: 66000,
      salaryMax: 90000,
      summary:
        "Design the programmes our facilitators deliver — from needs analysis to workbook.",
      description:
        "You will turn client needs and facilitator feedback into programmes that work in a room. That covers needs analysis, session architecture, exercise design, participant materials and the measurement approach. You will work closely with facilitators and revise based on what actually happens in delivery.",
      requirements: J([
        "3+ years in instructional or learning experience design",
        "Portfolio of adult learning programmes you designed",
        "Comfort with needs analysis and stakeholder interviews",
        "Familiarity with learning measurement beyond satisfaction scores",
      ]),
      benefits: J([
        "Fully remote within SGT ±3 hours",
        "Home office setup allowance",
        "Annual professional development budget",
        "Flexible hours around delivery commitments",
      ]),
      closesAt: daysOut(30, 23, 59),
    },
    {
      slug: "client-partnerships-manager",
      title: "Client Partnerships Manager",
      department: "Growth",
      location: "Singapore",
      employment: "Full-time",
      workMode: "Hybrid",
      experience: "4-6 years",
      salaryMin: 72000,
      salaryMax: 105000,
      summary:
        "Build long-term relationships with corporate clients across Singapore and the region.",
      description:
        "You will own the relationship with a portfolio of corporate clients: understanding what they are trying to change, shaping proposals with our delivery and consultancy teams, and staying involved through delivery. This is a consultative role — we are not looking for volume outreach.",
      requirements: J([
        "4+ years in B2B consultative sales or account management",
        "Experience selling services rather than products",
        "Comfort talking to HR and C-suite buyers",
        "Existing network in the Singapore corporate market is a plus",
      ]),
      benefits: J([
        "Uncapped commission on top of base",
        "Hybrid working",
        "Health and dental coverage",
        "Regular exposure to programme delivery",
      ]),
      closesAt: daysOut(60, 23, 59),
    },
    {
      slug: "operations-executive",
      title: "Operations Executive",
      department: "Operations",
      location: "Singapore",
      employment: "Full-time",
      workMode: "On-site",
      experience: "1-3 years",
      salaryMin: 42000,
      salaryMax: 58000,
      summary:
        "Keep sessions, venues, materials and participants running smoothly.",
      description:
        "The role that makes everything else possible: scheduling sessions, coordinating venues and catering, preparing materials, managing participant communications and handling the logistics of our public events. Suits someone highly organised who wants exposure to the whole business.",
      requirements: J([
        "1+ year in operations, events or administrative coordination",
        "Strong organisational skills and attention to detail",
        "Confident communicating with participants and vendors",
        "Comfortable with spreadsheets and scheduling tools",
      ]),
      benefits: J([
        "Structured onboarding and mentoring",
        "Health coverage",
        "Free access to all SingAdvisor programmes",
        "Clear progression path into delivery or partnerships",
      ]),
      closesAt: daysOut(25, 23, 59),
    },
    {
      slug: "marketing-intern",
      title: "Marketing Intern",
      department: "Growth",
      location: "Singapore",
      employment: "Internship",
      workMode: "Hybrid",
      experience: "Student / fresh graduate",
      salaryMin: 12000,
      salaryMax: 18000,
      summary:
        "Six-month internship across content, social and event marketing.",
      description:
        "A six-month internship for a student or recent graduate. You will work on content for our programmes, social media for events, and support marketing for the public event calendar. Real ownership of a workstream, not filing.",
      requirements: J([
        "Currently studying or recently graduated in marketing, communications or similar",
        "Strong written English",
        "Some experience with social platforms in a non-personal capacity",
        "Available for at least six months",
      ]),
      benefits: J([
        "Monthly internship allowance",
        "Mentorship from the growth team",
        "Free access to all SingAdvisor programmes",
        "Strong conversion rate to full-time offers",
      ]),
      closesAt: daysOut(20, 23, 59),
    },
  ];

  for (const j of jobs) await db.jobPosting.create({ data: j });
  console.log(`  ${jobs.length} job postings`);


  // -- Blog ----------------------------------------------------------------
  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const posts = [
    {
      slug: "training-that-survives-monday",
      title: "Why most corporate training dies by Monday",
      excerpt:
        "Participants leave energised and change nothing. The problem is rarely the content — it is that the session ended where the hard part began.",
      category: "Trainings",
      tags: J(["Learning design", "Behaviour change", "Measurement"]),
      coverImage: "/Images/Trainingimgae/traing.jpg",
      authorId: monica.id,
      featured: true,
      publishedAt: daysAgo(6),
      content: `Ask a room at the end of a training day whether it was useful and almost everyone says yes. Ask the same room six weeks later what they changed and the answers get vague. That gap is the whole problem, and it is not caused by bad content.

## The session ends where the hard part starts

A well-run day gives people a model, some practice in a safe room, and a burst of motivation. Then they return to a calendar that was already full, colleagues who did not attend, and a manager who has not changed what they ask for. None of the conditions that produced the old behaviour have moved.

Motivation is the most perishable thing we hand out. Treating it as the mechanism of change guarantees the result decays.

## Three things that make it stick

**Design for the constraint, not the ideal.** If someone has ninety minutes of uninterrupted time a week, a system that assumes four hours will be abandoned quietly. Ask about the real constraint first and build inside it.

**Change one observable behaviour.** "Communicate better" cannot be verified. "Open every written update with the decision you need" can — by the person, by their manager, by us.

**Book the follow-up before the session ends.** A thirty-minute check-in at four weeks changes what people do in week one, because they know it is coming. It costs almost nothing and it is the single highest-return thing we do.

> The measure of a programme is not what people felt on the day. It is what a colleague would notice two months later without being told a training had happened.

## What we ask clients to measure

We push for a metric that exists whether or not the training happened — meeting length, time-to-decision, attrition on a specific team, number of escalations. Satisfaction scores tell you the room was well run. They tell you nothing about whether it worked.

Sometimes that measurement says the programme did not move anything. That is uncomfortable and it is the point: it is the only way the next one gets better.`,
    },
    {
      slug: "four-questions-before-hiring-a-consultant",
      title: "Four questions to ask before hiring a consultant",
      excerpt:
        "Most disappointing engagements were mis-scoped before anyone signed. These four questions surface that in the first call.",
      category: "Consultancy",
      tags: J(["Consultancy", "Scoping", "Buying advice"]),
      coverImage: "/Images/Trainingimgae/consultancy.jpg",
      authorId: venkat.id,
      featured: true,
      publishedAt: daysAgo(19),
      content: `We turn down a meaningful share of the work we are offered. Not out of principle — because the engagement as described would not have produced anything. Here is what we listen for, and what you should ask of anyone you are considering, including us.

## 1. What will be different, and who would notice?

If the answer is a deliverable — a report, a framework, a workshop — the engagement is defined by its outputs rather than its effect. Push until the answer describes a person behaving differently. "Our team leads run their own retrospectives without us in the room" is a scope. "A team effectiveness report" is a receipt.

## 2. What happens if the diagnosis contradicts the brief?

You are usually buying a solution you have already decided on. A consultant who cannot tell you the premise is wrong is an expensive pair of hands. Ask directly: what would you do if the interviews say the problem is somewhere else? The answer tells you whether you are buying judgement or compliance.

## 3. Who does the work after you leave?

Any engagement that does not name an internal owner is designing its own repeat business. The handover should be in the proposal — documentation, templates, and a named person trained to run it.

## 4. What is the smallest version of this?

Good consultants will happily scope something smaller. A two-week diagnostic that tells you whether the larger programme is worth doing is almost always better value than committing to the programme up front.

## A note on the answers you will get

You are listening for specificity. Vague answers to any of these are not a sign of a bad consultant — but they are a sign the engagement is not ready to be bought yet, and that is worth another conversation before money moves.`,
    },
    {
      slug: "what-we-look-for-when-hiring-facilitators",
      title: "What we actually look for when hiring facilitators",
      excerpt:
        "A read of the room beats a polished deck every time. Here is what our hiring process is really testing.",
      category: "Careers",
      tags: J(["Hiring", "Facilitation", "Careers"]),
      coverImage: "/Images/Trainingimgae/comunicat.jpg",
      authorId: monica.id,
      publishedAt: daysAgo(33),
      content: `We get a lot of applications from people with strong training credentials who do not make it past the working session, and some from people with unusual backgrounds who do. It is worth being explicit about why.

## Reading the room beats delivering the deck

The hardest moment in facilitation is when the plan is not landing. A group is quiet, or one person has taken over, or the exercise you designed does not fit the problem they actually have. What we watch for in the working session is what you do in that moment — whether you notice, and whether you are willing to abandon your plan.

Candidates who deliver a flawless prepared session but do not adjust tend to struggle with real cohorts.

## Comfort with being wrong in public

Our facilitators say "I do not know, let me find out" in front of senior clients regularly. If admitting the limits of your knowledge feels like losing authority, corporate rooms will be uncomfortable.

## Writing matters more than people expect

Roughly forty percent of the job is written: proposals, session designs, client reports, follow-ups. We read cover letters closely for this reason. A short, specific, well-structured letter tells us more than a long list of certifications.

## What we do not weight heavily

Number of years. Certification alphabet. Having worked with famous logos. None of these predicted performance well enough for us to keep using them as filters.

If you are reading this because you are considering applying — apply. The working session is paid if it runs long, and we reply to everyone either way.`,
    },
    {
      slug: "running-events-people-return-to",
      title: "Running events people actually come back to",
      excerpt:
        "After forty-odd events we stopped optimising for attendance and started optimising for the second visit. Almost everything changed.",
      category: "Events",
      tags: J(["Events", "Community", "Facilitation"]),
      coverImage: "/Images/Events/Sep-29 (1).jpeg",
      authorId: venkat.id,
      publishedAt: daysAgo(47),
      content: `Attendance is a vanity metric. A free event in Singapore with decent catering will fill up regardless of quality. The number that told us something useful was how many people came to a second one.

## Cut the programme in half

Our early events were packed with content because it felt like better value. Attendance held; return rates were poor. People came for the talks and left immediately after.

We now run roughly half the sessions and protect a long, structured networking block. Return rates roughly doubled. The talks were never the reason people came back — the people were.

## Structure the networking

"Open networking" means the confident people talk to each other and everyone else looks at their phone. We now seat people deliberately, give each table a question, and have a facilitator on each one. It feels over-engineered for about four minutes and then it works.

## Say who it is not for

Our best-attended-by-the-right-people event had a line in the invitation saying it would not be useful if you were looking for vendors. Attendance dropped and the quality of conversation went up sharply.

## Follow up within 48 hours

Send the slides, the reading, and — most importantly — a way to reach the people they met. Do it while the event is still recent. After a week the connection has gone cold and the follow-up reads as marketing.`,
    },
    {
      slug: "time-management-advice-that-fails-students",
      title: "The time management advice that fails students",
      excerpt:
        "Most productivity systems were designed for people who control their own calendar. Students do not — and that changes the whole approach.",
      category: "Insights",
      tags: J(["Students", "Time management", "Habits"]),
      coverImage: "/Images/Trainingimgae/times.webp",
      authorId: venkat.id,
      publishedAt: daysAgo(61),
      content: `We have run the Manage Time session for several thousand students now. The most useful thing we learned was that most of the standard advice does not apply to them, and telling them it does makes things worse.

## The calendar is not theirs

Time-blocking assumes you decide what happens at 2pm. A student with fixed classes, a part-time job and family obligations decides very little of their week. Handing them a system built on that assumption produces guilt, not capability.

We start instead by mapping what is genuinely fixed, and only then look at what remains. It is usually less than people expect and more than they feared.

## Energy, not hours

The two hours after a long commute are not equivalent to the two hours after a good night's sleep. We ask students to rate their energy hourly for a week. Almost everyone discovers they have been putting their hardest work into their worst hours, purely out of habit.

## The restart matters more than the streak

Every system breaks — exams, illness, a bad month. Students who were taught to protect a streak tend to abandon the system entirely when it breaks. Students who were taught a restart procedure come back within days.

We spend a full segment on this now. It is the least glamorous part of the session and the one that shows up most in follow-ups a year later.

## What we stopped teaching

Elaborate tools. Any app-based system had been abandoned by the follow-up. Pen, paper and a recurring twenty-minute slot survived.`,
    },
    {
      slug: "measuring-wellbeing-programmes",
      title: "Your wellbeing programme is probably measuring the wrong thing",
      excerpt:
        "Participation rates tell you the programme was marketed well. They say nothing about whether anyone is better off.",
      category: "Consultancy",
      tags: J(["Wellbeing", "Measurement", "HR"]),
      coverImage: "/Images/Trainingimgae/health.jpg",
      authorId: monica.id,
      publishedAt: daysAgo(80),
      content: `Nearly every wellbeing programme we are asked to review reports the same numbers: sessions run, people attending, satisfaction score. All three can rise while the underlying problem gets worse.

## Participation measures marketing

A well-promoted lunchtime session with free food will be well attended in any organisation, including one where people are quietly burning out. High participation with flat outcomes usually means the programme is reaching people who were already coping.

## Ask what the programme is competing with

If someone has to choose between a resilience workshop and finishing work they will otherwise take home, attendance is a measure of workload, not interest. In one engagement, the strongest predictor of attending wellbeing sessions was having a manager who protected the time.

That finding redirected the entire programme towards manager behaviour, which is where the actual lever was.

## Numbers that survive scrutiny

Look for measures that exist independently of the programme: absence patterns, voluntary attrition on specific teams, the proportion of leave actually taken, out-of-hours email volume. None are perfect. All are harder to game than a satisfaction score.

## Be prepared for an unwelcome answer

Sometimes the honest finding is that the wellbeing programme is fine and the workload is the problem. That is not a comfortable report to deliver, and it is the only one worth paying for.`,
    },
    {
      slug: "hard-conversation-repair",
      title: "How to repair a conversation that went badly",
      excerpt:
        "Most workplace conflict is not caused by the difficult conversation. It is caused by never returning to it.",
      category: "Insights",
      tags: J(["Communication", "Emotion", "Teams"]),
      coverImage: "/Images/Trainingimgae/emot.webp",
      authorId: monica.id,
      publishedAt: daysAgo(102),
      content: `Everyone handles a hard conversation badly sometimes. You get defensive, or sharper than you meant to be, or you shut down entirely. That is survivable. What is not survivable, over time, is the silence afterwards.

## Why the repair gets skipped

Returning to it feels like reopening something that has settled. It has not settled — it has been filed. The other person is carrying their version of it, and every subsequent interaction is being read through that lens.

The discomfort of the repair conversation is short. The cost of skipping it compounds.

## A structure that works

Name the moment specifically. "In Thursday's review, when I cut you off" — not "if I upset you at some point."

Say what you did, not what you intended. Intent is your evidence for yourself; the other person only saw behaviour.

Do not attach it to a defence. The word "but" undoes everything before it.

Ask what they need. Sometimes the answer is nothing. Sometimes it is something concrete and easy that you would never have guessed.

## When you were the one wronged

You can open a repair from either side. "I have been carrying something from last week and I would rather say it than let it sit" is a complete opening.

Most people, offered a route back, take it.`,
    },
  ];

  for (const post of posts) await db.blogPost.create({ data: post });
  console.log(`  ${posts.length} blog posts`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
