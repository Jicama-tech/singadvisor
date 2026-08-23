import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import LoadingScreen from "@/components/ui/LoadingScreen";

/**
 * Classic React Router v6 JSX routing, all inline — mirroring eventsh-v1's
 * frontend/src/App.tsx conventions (React.lazy per page, one top-level
 * Suspense). eventsh branches its route tree per role; SingAdvisor has
 * exactly one role, so the whole admin dashboard nests under a single
 * guarded AdminLayout route (the guard lives there, modeled on eventsh's
 * RequireUserRole).
 */

// ---- admin pages -----------------------------------------------------------
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const TrainingsList = lazy(() => import("@/pages/admin/TrainingsList"));
const TrainingEdit = lazy(() => import("@/pages/admin/TrainingEdit"));
const ConsultancyList = lazy(() => import("@/pages/admin/ConsultancyList"));
const ConsultancyEdit = lazy(() => import("@/pages/admin/ConsultancyEdit"));
const CareersList = lazy(() => import("@/pages/admin/CareersList"));
const CareerEdit = lazy(() => import("@/pages/admin/CareerEdit"));
const BlogList = lazy(() => import("@/pages/admin/BlogList"));
const BlogEdit = lazy(() => import("@/pages/admin/BlogEdit"));
const NewsletterList = lazy(() => import("@/pages/admin/NewsletterList"));
const NewsletterEdit = lazy(() => import("@/pages/admin/NewsletterEdit"));
const LandingAdmin = lazy(() => import("@/pages/admin/LandingAdmin"));
const LandingSectionEdit = lazy(() => import("@/pages/admin/LandingSectionEdit"));
const RegistrationsList = lazy(() => import("@/pages/admin/RegistrationsList"));
const EnquiriesList = lazy(() => import("@/pages/admin/EnquiriesList"));
const ApplicationsList = lazy(() => import("@/pages/admin/ApplicationsList"));
const MessagesList = lazy(() => import("@/pages/admin/MessagesList"));
const EventsList = lazy(() => import("@/pages/admin/EventsList"));
const EventEdit = lazy(() => import("@/pages/admin/EventEdit"));
const ParticipantsList = lazy(() => import("@/pages/admin/ParticipantsList"));
const EventsPlaceholder = lazy(() => import("@/pages/admin/EventsPlaceholder"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const CrmList = lazy(() => import("@/pages/admin/CrmList"));
const CrmDetail = lazy(() => import("@/pages/admin/CrmDetail"));
const CrmNew = lazy(() => import("@/pages/admin/CrmNew"));

// ---- public pages ----------------------------------------------------------
const HomePage = lazy(() => import("@/pages/public/HomePage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const EventsIndex = lazy(() => import("@/pages/public/EventsIndex"));
const EventDetail = lazy(() => import("@/pages/public/EventDetail"));
const TrainingsIndex = lazy(() => import("@/pages/public/TrainingsIndex"));
const TrainingDetail = lazy(() => import("@/pages/public/TrainingDetail"));
const ConsultancyIndex = lazy(() => import("@/pages/public/ConsultancyIndex"));
const ConsultancyDetail = lazy(() => import("@/pages/public/ConsultancyDetail"));
const CareersIndex = lazy(() => import("@/pages/public/CareersIndex"));
const CareerDetail = lazy(() => import("@/pages/public/CareerDetail"));
const BlogIndex = lazy(() => import("@/pages/public/BlogIndex"));
const BlogDetail = lazy(() => import("@/pages/public/BlogDetail"));
const NewsletterIndex = lazy(() => import("@/pages/public/NewsletterIndex"));
const NewsletterDetail = lazy(() => import("@/pages/public/NewsletterDetail"));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage"));


export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* ---- public marketing site -------------------------------------- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/events" element={<EventsIndex />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/trainings" element={<TrainingsIndex />} />
        <Route path="/trainings/:slug" element={<TrainingDetail />} />
        <Route path="/consultancy" element={<ConsultancyIndex />} />
        <Route path="/consultancy/:slug" element={<ConsultancyDetail />} />
        <Route path="/careers" element={<CareersIndex />} />
        <Route path="/careers/:slug" element={<CareerDetail />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/newsletter" element={<NewsletterIndex />} />
        <Route path="/newsletter/:slug" element={<NewsletterDetail />} />

        {/* ---- admin dashboard -------------------------------------------- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Single persistent layout route: AdminLayout (the guarded shell)
            mounts once and every tab below swaps only the <Outlet/> content,
            so the sidebar/header never remount between tabs. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="landing" element={<LandingAdmin />} />
          <Route path="landing/:key" element={<LandingSectionEdit />} />
          <Route path="trainings" element={<TrainingsList />} />
          <Route path="trainings/new" element={<TrainingEdit />} />
          <Route path="trainings/:id" element={<TrainingEdit />} />
          <Route path="consultancy" element={<ConsultancyList />} />
          <Route path="consultancy/new" element={<ConsultancyEdit />} />
          <Route path="consultancy/:id" element={<ConsultancyEdit />} />
          <Route path="careers" element={<CareersList />} />
          <Route path="careers/new" element={<CareerEdit />} />
          <Route path="careers/:id" element={<CareerEdit />} />
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/new" element={<BlogEdit />} />
          <Route path="blog/:id" element={<BlogEdit />} />
          <Route path="newsletter" element={<NewsletterList />} />
          <Route path="newsletter/new" element={<NewsletterEdit />} />
          <Route path="newsletter/:id" element={<NewsletterEdit />} />
          <Route path="registrations" element={<RegistrationsList />} />
          <Route path="enquiries" element={<EnquiriesList />} />
          <Route path="applications" element={<ApplicationsList />} />
          <Route path="messages" element={<MessagesList />} />
          <Route path="events" element={<EventsList />} />
          <Route path="events/new" element={<EventEdit />} />
          <Route path="events/participants" element={<ParticipantsList />} />
          {/* The 10 known "Organizer dashboard" placeholder tabs are declared
              explicitly BEFORE :id — otherwise /admin/events/chatbot (etc.)
              would match the :id edit route and try to fetch an event with
              that literal id (a real bug found during cutover QA: the edit
              page rendered "Event not found" on every placeholder tab).
              ObjectIds never collide with these names. */}
          <Route path="events/chatbot" element={<EventsPlaceholder tab="chatbot" />} />
          <Route path="events/analytics" element={<EventsPlaceholder tab="analytics" />} />
          <Route path="events/kiosk" element={<EventsPlaceholder tab="kiosk" />} />
          <Route path="events/platform-fees" element={<EventsPlaceholder tab="platform-fees" />} />
          <Route path="events/crm" element={<EventsPlaceholder tab="crm" />} />
          <Route path="events/feedback" element={<EventsPlaceholder tab="feedback" />} />
          <Route path="events/membership" element={<EventsPlaceholder tab="membership" />} />
          <Route path="events/support" element={<EventsPlaceholder tab="support" />} />
          <Route path="events/eventfront" element={<EventsPlaceholder tab="eventfront" />} />
          <Route path="events/settings" element={<EventsPlaceholder tab="settings" />} />
          <Route path="events/:id" element={<EventEdit />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="crm" element={<CrmList />} />
          <Route path="crm/new" element={<CrmNew />} />
          <Route path="crm/:id" element={<CrmDetail />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
