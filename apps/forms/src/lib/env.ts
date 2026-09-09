export const env = {
  adminOrigin: (process.env.ADMIN_ORIGIN ?? "http://localhost:3000").replace(/\/$/, ""),
};
