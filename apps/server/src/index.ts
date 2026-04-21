import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { GAME_RULES, type ChatMessage } from "@aviator-zim/shared";
import { env } from "./config/env.js";
import { ensureDemoUser, finalizeCrashedRound, processAutoCashOuts } from "./lib/account-repository.js";
import { liveChat, leaderboard } from "./lib/store.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { createGameRouter } from "./routes/game.js";
import { meRouter } from "./routes/me.js";
import { paymentsRouter } from "./routes/payments.js";
import { createPublicRouter } from "./routes/public.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { GameEngine } from "./services/gameEngine.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const gameEngine = new GameEngine();
app.use("/api/auth", authRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/me", requireAuth, meRouter);
app.use("/api/me/game", requireAuth, createGameRouter(gameEngine));
app.use("/api/admin", requireAuth, requireAdmin, adminRouter);
app.use("/api", createPublicRouter(gameEngine));

io.on("connection", (socket) => {
  socket.emit("round:update", gameEngine.getPublicState());
  socket.emit("community:update", { chat: liveChat.slice(-25), leaderboard });
  socket.emit("rules", GAME_RULES);

  socket.on("chat:message", (payload: { user: string; text: string }) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user: payload.user || "Guest",
      text: payload.text.slice(0, 240),
      timestamp: new Date().toISOString()
    };

    liveChat.push(message);
    io.emit("community:update", { chat: liveChat.slice(-25), leaderboard });
  });
});

gameEngine.on("round", (state) => {
  void processAutoCashOuts(state.roundId, state.currentMultiplier);
  io.emit("round:update", state);
});
gameEngine.on("crash", (round) => {
  void finalizeCrashedRound(round);
  io.emit("round:crashed", round);
});
gameEngine.start();

async function startServer() {
  await ensureDemoUser();

  server.listen(env.PORT, () => {
    console.log(`Aviator Zim server listening on http://localhost:${env.PORT}`);
  });
}

void startServer().catch((error) => {
  console.error("Unable to start Aviator Zim server", error);
  process.exit(1);
});
