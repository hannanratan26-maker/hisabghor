import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "সহজ হিসাব ঘর | দোকানের হিসাব সহজে" },
      { name: "description", content: "বাকির খাতা, ক্যাশ বক্স, পণ্য ও লেনদেন — ছোট ব্যবসার পূর্ণ হিসাব এক অ্যাপে।" },
      { property: "og:title", content: "সহজ হিসাব ঘর | দোকানের হিসাব সহজে" },
      { property: "og:description", content: "বাকির খাতা, ক্যাশ বক্স, পণ্য ও লেনদেন — ছোট ব্যবসার পূর্ণ হিসাব এক অ্যাপে।" },
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
