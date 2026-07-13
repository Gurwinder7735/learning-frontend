import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/constants/appConstants";

export default function Home() {
  redirect(APP_ROUTES.dashboard);
}
