import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createServer } from "http";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serveStatic";
import { registerDevServer } from "./vite";

export async function createApp() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await registerDevServer(app, server);
  }

  return { app, server };
}
