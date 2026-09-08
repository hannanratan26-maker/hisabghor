import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/Dashboard")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড | সহজ হিসাব ঘর" },
      { name: "description", content: "দোকানের বাকি, নগদ ও লেনদেনের সারসংক্ষেপ এক নজরে দেখুন।" },
      { property: "og:title", content: "ড্যাশবোর্ড | সহজ হিসাব ঘর" },
      { property: "og:description", content: "দোকানের বাকি, নগদ ও লেনদেনের সারসংক্ষেপ এক নজরে দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Dashboard" withLayout={true} withGuard={true}>
      <Dashboard />
    </AppPage>
  );
}
