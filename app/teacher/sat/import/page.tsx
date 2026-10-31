import { redirect } from "next/navigation";
import { SAT_MATH_TAXONOMY_SLUG } from "@/lib/SatMathQuiz";

/**
 * The importer serves every subject now and lives at `/teacher/create/import`
 * (docs/SAT_QUIZ.md). This path is kept so old links and bookmarks land on it
 * with SAT preselected.
 */
export default function SatImportRedirect() {
  redirect(`/teacher/create/import?subject=${SAT_MATH_TAXONOMY_SLUG}&back=/teacher/sat`);
}
