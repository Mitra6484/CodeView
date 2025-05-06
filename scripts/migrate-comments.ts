import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

async function main() {
  const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
  try {
    console.log("Starting comments migration...");
    await client.mutation(api.comments.migrateComments);
    console.log("Comments migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    process.exit(0);
  }
}

main(); 