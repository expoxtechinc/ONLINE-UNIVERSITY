import { startServer } from "./server/_core/index";

startServer().catch((error) => {
  console.error("Online University server failed to start", error);
  process.exit(1);
});
