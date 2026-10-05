// Creates the Google Drive folder that receives the uploaded files (ADR-0015).
// It must be created by the app itself: with the drive.file scope, the app only
// sees the files and folders it created. Prints the id for GOOGLE_DRIVE_FOLDER_ID.
// Usage: npm run drive:create-folder   (reads GOOGLE_DRIVE_* from .env)
import "dotenv/config";
import { driveAccessToken, driveConfigFromEnv } from "../src/server/files/storage";

async function main() {
  const config = driveConfigFromEnv();
  if (!config) {
    throw new Error("Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET and GOOGLE_DRIVE_REFRESH_TOKEN in .env first.");
  }
  const token = await driveAccessToken(config)();
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Agenda da Barbearia - arquivos", mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!response.ok) throw new Error(`Google Drive answered ${response.status}: ${await response.text()}`);
  const folder = (await response.json()) as { id: string; name: string };
  console.log(`Folder "${folder.name}" created. Set in the environment:\nGOOGLE_DRIVE_FOLDER_ID="${folder.id}"`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
