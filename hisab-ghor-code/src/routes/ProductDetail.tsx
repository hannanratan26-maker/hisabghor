import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import ProductDetail from "@/pages/ProductDetail";

export const Route = createFileRoute("/ProductDetail")({
  head: () => ({
    meta: [
      { title: "পণ্যের বিবরণ | সহজ হিসাব ঘর" },
      { name: "description", content: "পণ্যের দাম, স্টক ও বিক্রির বিবরণ দেখুন।" },
      { property: "og:title", content: "পণ্যের বিবরণ | সহজ হিসাব ঘর" },
      { property: "og:description", content: "পণ্যের দাম, স্টক ও বিক্রির বিবরণ দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="ProductDetail" withLayout={true} withGuard={true}>
      <ProductDetail />
    </AppPage>
  );
}
