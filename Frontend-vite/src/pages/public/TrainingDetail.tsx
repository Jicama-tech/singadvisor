import { Helmet } from "react-helmet-async";

export default function TrainingDetail() {
  return (
    <div className="container-page py-20 text-center">
      <Helmet>
        <title>Training — SingAdvisor</title>
      </Helmet>
      <h1 className="text-3xl">Training</h1>
      <p className="mt-3 text-[var(--text-secondary)]">
        This page is being ported to the new site and is not wired up yet.
      </p>
    </div>
  );
}
