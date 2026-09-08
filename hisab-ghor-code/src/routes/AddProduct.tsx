import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import AddProduct from "@/pages/AddProduct";

export const Route = createFileRoute("/AddProduct")({
  head: () => ({
    meta: [
      { title: "পণ্য যোগ করুন | সহজ হিসাব ঘর" },
      { name: "description", content: "নতুন পণ্য যোগ করুন বা তথ্য সম্পাদনা করুন।" },
      { property: "og:title", content: "পণ্য যোগ করুন | সহজ হিসাব ঘর" },
      { property: "og:description", content: "নতুন পণ্য যোগ করুন বা তথ্য সম্পাদনা করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="AddProduct" withLayout={true} withGuard={true}>
      <AddProduct />
    </AppPage>
  );
}
