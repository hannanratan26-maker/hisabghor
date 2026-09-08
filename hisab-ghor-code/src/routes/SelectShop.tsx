import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import SelectShop from "@/pages/SelectShop";

export const Route = createFileRoute("/SelectShop")({
  head: () => ({
    meta: [
      { title: "দোকান সিলেক্ট করুন | সহজ হিসাব ঘর" },
      { name: "description", content: "আপনার দোকান বেছে নিয়ে সেই দোকানের হিসাব দেখুন।" },
      { property: "og:title", content: "দোকান সিলেক্ট করুন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "আপনার দোকান বেছে নিয়ে সেই দোকানের হিসাব দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="SelectShop" withLayout={false} withGuard={false}>
      <SelectShop />
    </AppPage>
  );
}
