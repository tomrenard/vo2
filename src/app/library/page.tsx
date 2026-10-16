import { LESSONS } from "@/lib/content-index";
import { GLOSSARY, SOURCES } from "@/lib/refs-index";
import { requireUser } from "@/lib/session";
import { TabBar } from "../TabBar";
import { Library } from "./Library";

/** Look things up: concepts, terms and every source the course cites. */
export default async function LibraryPage() {
  await requireUser();
  const concepts = LESSONS.flatMap((lesson) =>
    lesson.steps.flatMap((step) =>
      step.type === "concept"
        ? [{ title: step.title, lesson: lesson.id, id: step.id, lessonTitle: lesson.title }]
        : [],
    ),
  );
  return (
    <main className="screen with-tabs">
      <h1 className="pt-2 font-serif text-3xl">Library</h1>
      <Library concepts={concepts} glossary={GLOSSARY} sources={SOURCES} />
      <TabBar active="/library" />
    </main>
  );
}
