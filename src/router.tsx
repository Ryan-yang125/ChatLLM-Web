import { RouterProvider, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { App } from "@/App";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { ModelsPage } from "@/components/ModelsPage";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <App>{(openMobile) => <ChatWorkspace onOpenMobile={openMobile} />}</App>,
});
const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/models",
  component: () => <App>{() => <ModelsPage />}</App>,
});
const routeTree = rootRoute.addChildren([indexRoute, modelsRoute]);

export const router = createRouter({ routeTree, defaultPreload: "intent", scrollRestoration: false });

declare module "@tanstack/react-router" { interface Register { router: typeof router; } }

export function AppRouterProvider() { return <RouterProvider router={router} />; }
