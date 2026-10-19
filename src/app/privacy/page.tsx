import {connection} from "next/server";
import PrivacyPolicy from "../../components/privacy-policy";
export default async function Privacy(){await connection();return <PrivacyPolicy/>;}
