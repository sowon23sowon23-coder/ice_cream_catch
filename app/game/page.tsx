import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GameClient from "./GameClient";
import { formatEntryCode } from "../lib/entry";

export default async function GamePage() {
  const cookieStore = await cookies();
  const rawEntryId = cookieStore.get("entry_id")?.value;
  const entryId = Number(rawEntryId);

  if (!rawEntryId || !Number.isInteger(entryId) || entryId <= 0) {
    redirect("/entry");
  }

  return <GameClient entryId={entryId} entryCode={formatEntryCode(entryId)} />;
}

