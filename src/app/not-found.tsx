import { connection } from "next/server";
import AppFallback from "../components/app-fallback";
export default async function NotFound(){
  await connection();
  return <AppFallback kind="notFound"/>;
}
