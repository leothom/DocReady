import {connection} from 'next/server';
import InformationPage from '../../components/information-page';
export default async function Page(){await connection();return <InformationPage kind="contact"/>;}
