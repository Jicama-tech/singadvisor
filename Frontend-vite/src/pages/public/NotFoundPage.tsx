import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-3 text-[var(--text-secondary)]">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-block text-[var(--accent)] underline">Back to home</Link>
    </div>
  );
}
