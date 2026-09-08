import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/Admin")({
  head: () => ({
    meta: [
      { title: "অ্যাডমিন | সহজ হিসাব ঘর" },
      { name: "description", content: "অ্যাডমিন প্যানেলে প্রবেশ করুন।" },
      { property: "og:title", content: "অ্যাডমিন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "অ্যাডমিন প্যানেলে প্রবেশ করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Admin" withLayout={false} withGuard={false} skipAuth={true}>
      <Admin />
    </AppPage>
  );
}
