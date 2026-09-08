import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Reports from "@/pages/Reports";

export const Route = createFileRoute("/Reports")({
  head: () => ({
    meta: [
      { title: "রিপোর্ট | সহজ হিসাব ঘর" },
      { name: "description", content: "আয়, ব্যয় ও বাকির বিস্তারিত রিপোর্ট তৈরি করুন।" },
      { property: "og:title", content: "রিপোর্ট | সহজ হিসাব ঘর" },
      { property: "og:description", content: "আয়, ব্যয় ও বাকির বিস্তারিত রিপোর্ট তৈরি করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Reports" withLayout={true} withGuard={true}>
      <Reports />
    </AppPage>
  );
}
