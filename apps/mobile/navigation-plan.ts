import {
  mobileTabNavigationItems,
  sharedNavigationItems,
} from "../../packages/shared/src/navigation";

export const mobileNavigationPlan = {
  drawer: sharedNavigationItems
    .filter((item) => item.requiresAuth && !item.adminOnly)
    .map((item) => ({
      key: item.key,
      label: item.label,
      path: item.mobilePath,
    })),
  protectedRoutes: sharedNavigationItems
    .filter((item) => item.requiresAuth)
    .map((item) => item.mobilePath),
  tabs: mobileTabNavigationItems.map((item) => ({
    key: item.key,
    label: item.label,
    path: item.mobilePath,
  })),
};
