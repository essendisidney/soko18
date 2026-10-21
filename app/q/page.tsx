import type { Metadata } from "next";
import { QuestionCards } from "@/components/growth/question-cards";
import { questionDeck, questionOfTheWeek } from "@/lib/growth/question";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const q = questionOfTheWeek();
  return {
    title: "Question of the week",
    description: `${q} Answer it on Kutana.`,
    openGraph: { title: q, description: "This week’s question on Kutana. What’s yours?" },
  };
}

export default function QuestionPage() {
  return <QuestionCards deck={questionDeck()} />;
}
