import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Activation from "@/pages/Activation";

export const Route = createFileRoute("/Activation")({
  head: () => ({
    meta: [
      { title: "অ্যাক্টিভেশন | সহজ হিসাব ঘর" },
      { name: "description", content: "অ্যাক্টিভেশন কোড দিয়ে অ্যাকাউন্ট চালু করুন।" },
      { property: "og:title", content: "অ্যাক্টিভেশন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "অ্যাক্টিভেশন কোড দিয়ে অ্যাকাউন্ট চালু করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Activation" withLayout={false} withGuard={false}>
      <Activation />
    </AppPage>
  );
}
