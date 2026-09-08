import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Settings from "@/pages/Settings";

export const Route = createFileRoute("/Settings")({
  head: () => ({
    meta: [
      { title: "সেটিংস | সহজ হিসাব ঘর" },
      { name: "description", content: "প্রোফাইল, ভাষা ও অ্যাপের সেটিংস পরিবর্তন করুন।" },
      { property: "og:title", content: "সেটিংস | সহজ হিসাব ঘর" },
      { property: "og:description", content: "প্রোফাইল, ভাষা ও অ্যাপের সেটিংস পরিবর্তন করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Settings" withLayout={true} withGuard={true}>
      <Settings />
    </AppPage>
  );
}
