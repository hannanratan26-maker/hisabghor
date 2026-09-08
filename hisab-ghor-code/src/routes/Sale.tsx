import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Sale from "@/pages/Sale";

export const Route = createFileRoute("/Sale")({
  head: () => ({
    meta: [
      { title: "বিক্রি করুন | সহজ হিসাব ঘর" },
      { name: "description", content: "দ্রুত বিক্রি ও প্রোডাক্ট লিস্ট থেকে বিক্রি করুন।" },
      { property: "og:title", content: "বিক্রি করুন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "দ্রুত বিক্রি ও প্রোডাক্ট লিস্ট থেকে বিক্রি করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Sale" withLayout={true} withGuard={true}>
      <Sale />
    </AppPage>
  );
}
