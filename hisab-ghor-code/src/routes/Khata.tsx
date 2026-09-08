import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Khata from "@/pages/Khata";

export const Route = createFileRoute("/Khata")({
  head: () => ({
    meta: [
      { title: "বাকীর খাতা | সহজ হিসাব ঘর" },
      { name: "description", content: "গ্রাহক ও সরবরাহকারীর বাকীর খাতা পরিচালনা করুন।" },
      { property: "og:title", content: "বাকীর খাতা | সহজ হিসাব ঘর" },
      { property: "og:description", content: "গ্রাহক ও সরবরাহকারীর বাকীর খাতা পরিচালনা করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Khata" withLayout={true} withGuard={true}>
      <Khata />
    </AppPage>
  );
}
