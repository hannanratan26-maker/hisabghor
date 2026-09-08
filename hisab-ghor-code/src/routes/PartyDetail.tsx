import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import PartyDetail from "@/pages/PartyDetail";

export const Route = createFileRoute("/PartyDetail")({
  head: () => ({
    meta: [
      { title: "পার্টির বিবরণ | সহজ হিসাব ঘর" },
      { name: "description", content: "নির্দিষ্ট গ্রাহক বা সরবরাহকারীর লেনদেনের বিবরণ।" },
      { property: "og:title", content: "পার্টির বিবরণ | সহজ হিসাব ঘর" },
      { property: "og:description", content: "নির্দিষ্ট গ্রাহক বা সরবরাহকারীর লেনদেনের বিবরণ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="PartyDetail" withLayout={true} withGuard={true}>
      <PartyDetail />
    </AppPage>
  );
}
