import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import SalesLedger from "@/pages/SalesLedger";

export const Route = createFileRoute("/SalesLedger")({
  head: () => ({
    meta: [
      { title: "বেচার খাতা | সহজ হিসাব ঘর" },
      { name: "description", content: "দিন, মাস ও বছর অনুযায়ী বিক্রির রিসিপ্ট ও মোট বিক্রি দেখুন।" },
      { property: "og:title", content: "বেচার খাতা | সহজ হিসাব ঘর" },
      { property: "og:description", content: "দিন, মাস ও বছর অনুযায়ী বিক্রির রিসিপ্ট ও মোট বিক্রি দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="SalesLedger" withLayout={true} withGuard={true}>
      <SalesLedger />
    </AppPage>
  );
}
