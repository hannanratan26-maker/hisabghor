import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import CreateShop from "@/pages/CreateShop";

export const Route = createFileRoute("/CreateShop")({
  head: () => ({
    meta: [
      { title: "দোকান তৈরি করুন | সহজ হিসাব ঘর" },
      { name: "description", content: "নাম, ধরন ও ঠিকানা দিয়ে নতুন দোকান তৈরি করুন।" },
      { property: "og:title", content: "দোকান তৈরি করুন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "নাম, ধরন ও ঠিকানা দিয়ে নতুন দোকান তৈরি করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="CreateShop" withLayout={false} withGuard={false}>
      <CreateShop />
    </AppPage>
  );
}
