import { redirect } from "next/navigation";

export default async function AdminPage() {
  redirect("/dashboard/song-generator");
  return null;
}
