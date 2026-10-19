import { connection } from "next/server";
import TeacherReview from "../components/teacher-review";
export default async function Home(){
  // A fresh CSP nonce requires dynamic rendering so the page is not prerendered.
  await connection();
  return <TeacherReview/>;
}
