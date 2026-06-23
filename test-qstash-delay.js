import { Client } from "@upstash/qstash";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const qstash = new Client({ token: process.env.QSTASH_TOKEN });
  try {
    const res = await qstash.publishJSON({
      url: "https://example.com",
      delay: "10s",
      body: {}
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
