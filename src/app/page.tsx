import { redirect } from "next/navigation";

// The product opens directly in the assistant conversation.
export default function Home() {
  redirect("/chat");
}
