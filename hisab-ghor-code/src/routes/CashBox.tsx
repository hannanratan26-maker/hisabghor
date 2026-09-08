import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import CashBox from "@/pages/CashBox";

export const Route = createFileRoute("/CashBox")({
  head: () => ({
    meta: [
      { title: "ক্যাশ বক্স | সহজ হিসাব ঘর" },
      { name: "description", content: "দৈনিক নগদ আয় ও খরচের হিসাব রাখুন।" },
      { property: "og:title", content: "ক্যাশ বক্স | সহজ হিসাব ঘর" },
      { property: "og:description", content: "দৈনিক নগদ আয় ও খরচের হিসাব রাখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="CashBox" withLayout={true} withGuard={true}>
      <CashBox />
    </AppPage>
  );
}
