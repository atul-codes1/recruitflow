import { Client } from "@upstash/qstash";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const qstash = new Client({ token: process.env.QSTASH_TOKEN });
  try {
    const events = await qstash.events();
    console.log("Events:", events);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
