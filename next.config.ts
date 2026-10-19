import type {NextConfig} from "next";
// Docker needs a standalone server; local npm start keeps the normal server.
const config:NextConfig={output:process.env.DOCREADY_STANDALONE==="true"?"standalone":undefined};
export default config;
