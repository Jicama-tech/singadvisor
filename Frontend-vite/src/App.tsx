import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/ui/LoadingScreen";

/**
 * Classic React Router v6 JSX routing, all inline — mirroring eventsh-v1's
 * frontend/src/App.tsx conventions (React.lazy per page, one top-level
 * Suspense). eventsh branches its route tree per role; SingAdvisor has
 * exactly one role, so this is a single tree with a RequireAdmin wrapper
 * modeled on eventsh's RequireUserRole.
 */

// ---- admin pages -----------------------------------------------------------
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const TrainingsList = lazy(() => import("@/pages/admin/TrainingsList"));
const TrainingEdit = lazy(() => import("@/pages/admin/TrainingEdit"));
const ConsultancyList = lazy(() => import("@/pages/admin/ConsultancyList"));
const ConsultancyEdit = lazy(() => import("@/pages/admin/ConsultancyEdit"));
const CareersList = lazy(() => import("@/pages/admin/CareersList"));
const CareerEdit = lazy(() => import("@/pages/admin/CareerEdit"));
const BlogList = lazy(() => import("@/pages/admin/BlogList"));
const BlogEdit = lazy(() => import("@/pages/admin/BlogEdit"));
const LandingAdmin = lazy(() => import("@/pages/admin/LandingAdmin"));
const RegistrationsList = lazy(() => import("@/pages/admin/RegistrationsList"));
const EnquiriesList = lazy(() => import("@/pages/admin/EnquiriesList"));
const ApplicationsList = lazy(() => import("@/pages/admin/ApplicationsList"));
const MessagesList = lazy(() => import("@/pages/admin/MessagesList"));
const EventsList = lazy(() => import("@/pages/admin/EventsList"));
const EventEdit = lazy(() => import("@/pages/admin/EventEdit"));
const ParticipantsList = lazy(() => import("@/pages/admin/ParticipantsList"));
const EventsPlaceholder = lazy(() => import("@/pages/admin/EventsPlaceholder"));

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
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage"));

/** Single guarded wrapper (eventsh's RequireUserRole, minus the multi-role
 * switch): unauthenticated → /admin/login with a ?next= return path. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

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

        {/* ---- admin dashboard -------------------------------------------- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminOverview />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/trainings"
          element={
            <RequireAdmin>
              <TrainingsList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/trainings/new"
          element={
            <RequireAdmin>
              <TrainingEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/trainings/:id"
          element={
            <RequireAdmin>
              <TrainingEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/consultancy"
          element={
            <RequireAdmin>
              <ConsultancyList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/consultancy/new"
          element={
            <RequireAdmin>
              <ConsultancyEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/consultancy/:id"
          element={
            <RequireAdmin>
              <ConsultancyEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/careers"
          element={
            <RequireAdmin>
              <CareersList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/careers/new"
          element={
            <RequireAdmin>
              <CareerEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/careers/:id"
          element={
            <RequireAdmin>
              <CareerEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/blog"
          element={
            <RequireAdmin>
              <BlogList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/blog/new"
          element={
            <RequireAdmin>
              <BlogEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/blog/:id"
          element={
            <RequireAdmin>
              <BlogEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/landing"
          element={
            <RequireAdmin>
              <LandingAdmin />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/registrations"
          element={
            <RequireAdmin>
              <RegistrationsList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/enquiries"
          element={
            <RequireAdmin>
              <EnquiriesList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <RequireAdmin>
              <ApplicationsList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <RequireAdmin>
              <MessagesList />
            </RequireAdmin>
          }
        />
        {/* Events dashboard (organizer-style nested nav) */}
        <Route
          path="/admin/events"
          element={
            <RequireAdmin>
              <EventsList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/events/new"
          element={
            <RequireAdmin>
              <EventEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/events/:id"
          element={
            <RequireAdmin>
              <EventEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/events/participants"
          element={
            <RequireAdmin>
              <ParticipantsList />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/events/:tab"
          element={
            <RequireAdmin>
              <EventsPlaceholder />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
