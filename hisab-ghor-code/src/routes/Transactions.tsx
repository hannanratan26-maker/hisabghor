import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import Transactions from "@/pages/Transactions";

export const Route = createFileRoute("/Transactions")({
  head: () => ({
    meta: [
      { title: "লেনদেন | সহজ হিসাব ঘর" },
      { name: "description", content: "সব লেনদেনের পূর্ণ তালিকা ও বিস্তারিত দেখুন।" },
      { property: "og:title", content: "লেনদেন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "সব লেনদেনের পূর্ণ তালিকা ও বিস্তারিত দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="Transactions" withLayout={true} withGuard={true}>
      <Transactions />
    </AppPage>
  );
}
