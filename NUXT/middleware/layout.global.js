export default defineNuxtRouteMiddleware((to) => {
  const emptyLayoutRoutes = [
    '/',
    '/watch',
    '/activities/install',
    '/activities/update',
    '/mods/updates',
  ];

  if (emptyLayoutRoutes.includes(to.path) || to.path === '/watch') {
    setPageLayout('empty');
  }
});
