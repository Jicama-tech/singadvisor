import { Navigate, useParams } from "react-router-dom";

/** /admin/facilitators/:id moved under the Trainings nested nav. A static
 * <Navigate to="…/:id"> would navigate to a literal ":id" segment, so the
 * param has to be read and re-inserted. */
export default function FacilitatorRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/trainings/facilitators/${id ?? ""}`} replace />;
}
