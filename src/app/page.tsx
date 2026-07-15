import { redirect } from "next/navigation";

// The app opens straight on the HSL journey planner.
export default function Home() {
  redirect("/journey");
}
