import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // স্ক্রল পজিশন পুনরুদ্ধার বন্ধ — পেজ বদলের সময় পুরনো স্ক্রলে
    // একঝলক দেখিয়ে পরে লাফানোর (কাপুনি) কারণ হয়। Layout নিজেই
    // প্রতিটি পেজ বদলে স্ক্রল উপরে নিয়ে আসে।
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
