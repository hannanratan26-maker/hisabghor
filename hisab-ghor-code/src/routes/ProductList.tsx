import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import ProductList from "@/pages/ProductList";

export const Route = createFileRoute("/ProductList")({
  head: () => ({
    meta: [
      { title: "পণ্য তালিকা | সহজ হিসাব ঘর" },
      { name: "description", content: "দোকানের সব পণ্য ও স্টক দেখুন।" },
      { property: "og:title", content: "পণ্য তালিকা | সহজ হিসাব ঘর" },
      { property: "og:description", content: "দোকানের সব পণ্য ও স্টক দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="ProductList" withLayout={true} withGuard={true}>
      <ProductList />
    </AppPage>
  );
}
