import { createFileRoute } from "@tanstack/react-router";
import AppPage from "@/components/AppPage";
import AdminDashboard from "@/pages/AdminDashboard";

export const Route = createFileRoute("/AdminDashboard")({
  head: () => ({
    meta: [
      { title: "অ্যাডমিন ড্যাশবোর্ড | সহজ হিসাব ঘর" },
      { name: "description", content: "ব্যবহারকারী, প্যাকেজ ও অ্যাক্টিভেশন পরিচালনা করুন।" },
      { property: "og:title", content: "অ্যাডমিন ড্যাশবোর্ড | সহজ হিসাব ঘর" },
      { property: "og:description", content: "ব্যবহারকারী, প্যাকেজ ও অ্যাক্টিভেশন পরিচালনা করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppPage name="AdminDashboard" withLayout={false} withGuard={false} skipAuth={true}>
      <AdminDashboard />
    </AppPage>
  );
}
