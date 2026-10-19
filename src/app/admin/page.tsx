import { connection } from "next/server";
import AdminPanel from "../../components/admin-panel";
import "./admin.css";

export default async function AdminPage() {
  await connection();
  return <AdminPanel />;
}
