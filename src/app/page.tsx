import { redirect } from "next/navigation";

// Root "/" redirects to the Command Center
export default function Home() {
  redirect("/dashboard");
}
