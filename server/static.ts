import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectMeta } from "./meta-inject";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    try {
      let html = await fs.promises.readFile(indexPath, "utf-8");
      const pathname = req.originalUrl.split("?")[0];
      html = await injectMeta(html, pathname);
      res.set("Content-Type", "text/html").send(html);
    } catch {
      res.sendFile(indexPath);
    }
  });
}
