# Alibaba Cloud Hong Kong deployment

Status: private pilot deployed on 5 October 2026. The user created the Hong Kong Ubuntu 24.04 server at public IP 8.210.219.205, with 2 vCPUs, 4 GiB memory and 50 GiB disk. The user owns slideready.xyz at Namecheap. SSH key access and authoritative DNS routing are verified. Docker and Compose are installed. The final committed Linux image and private HTTPS container test passed on the server, including after Ubuntu updates and a restart. UFW is active with TCP 22, 80 and 443 allowed. Cloud firewall console checks remain open. The tested image and server folder are recorded in docs/stage-6.md. The app is online at https://slideready.xyz. The user authorized server secrets and publication. Remaining pilot checks are listed in docs/stage-6.md. This guide does not authorize a purchase, DNS change, publication or a message to Wayne. Run the full release check before publication.

## Server choice

Use Simple Application Server, China (Hong Kong), General-purpose, Ubuntu 24.04, 2 vCPUs and 4 GiB memory. The user's purchase screen shows USD 16 per month and a 50 GB disk. Start with one month, one server and no extra data disk. The 2 GiB plan may run the app, but 4 GiB leaves more build and update margin. Do not use the International BGP_NCO family for the mainland school trial. It is marked Non-China Optimized. Actual school network access still needs a test.

The app reads PowerPoint files on the teacher's computer. Extra server disk is not needed to store those files.

Check the final console price, renewal price and OS version before purchase. Do not choose the old Node.js application image: this project runs a current Node runtime in Docker.

## Server and domain setup

1. Create the server and record its public IPv4 address. Use SSH keys for server access. Keep SSH port 22 restricted to the admin's IP where practical. In the Alibaba firewall, allow public TCP ports 80 and 443. Do not expose port 3100. The app listens only inside the Docker network.
2. Use slideready.xyz. In Namecheap, use BasicDNS and open Domain List > Manage > Advanced DNS. Set an A record: host @, value 8.210.219.205, TTL Automatic. Remove only conflicting parking or URL redirect records for @. Keep unrelated mail records. Do not add an AAAA record unless IPv6 is configured and tested. The chosen app address is https://slideready.xyz.
3. Install Docker Engine and the Docker Compose plugin using the official Ubuntu guide. Enable Docker at boot. Apply Ubuntu security updates. We use the OS image, not a preconfigured web stack.
4. Copy the approved source to a private folder on the server. Use a GitHub deploy key scoped to the private repo, or transfer a clean git archive from the computer. Do not copy .env.local, node_modules, .next, evidence, test-results, .superpowers or any school files. Never put a GitHub token in a clone URL.

## First configuration

Work from the repository root. These copy commands are for the FIRST setup only. They must not replace an existing secret file.

~~~sh
test ! -e deploy/.env && install -m 600 deploy/site.env.example deploy/.env
test ! -e deploy/server.env && install -m 600 deploy/server.env.example deploy/server.env
~~~

Edit deploy/.env:

- SITE_HOST: slideready.xyz, with no scheme, path or trailing slash.
- SLIDEREADY_IMAGE: slideready followed by a colon and the full reviewed Git commit SHA. Use a new tag for each release. Keep the previous image for rollback.

Edit deploy/server.env in a server editor:

- DEEPSEEK_API_KEY: the provider key. Enter it here only; do not paste it in chat or a shell argument.
- PILOT_INVITE_SECRET and SESSION_SECRET: two different random secrets, at least 32 characters each. Generate each with openssl rand -hex 32 and paste the output into the editor.
- PILOT_ENABLED: leave false until the full release check and publication approval. Set true when the approved trial starts.
- PILOT_DAILY_LIMIT: initially 100 calls shared across connection tests and reviews. This is an in-memory guard and resets on restart. It is not a hard spending cap. Set provider billing alerts. Do not present unknown token cost as zero.

The app's APP_ORIGIN is derived from SITE_HOST. The model key is supplied only to the app container at runtime. It is not supplied to Caddy, Docker build arguments or browser code.

## Validate, build and start

The following start step is for AFTER publication approval. First run the required release gate and resolve its blocking findings.

~~~sh
docker compose --env-file deploy/.env -f deploy/compose.yaml config --quiet
docker compose --env-file deploy/.env -f deploy/compose.yaml build app
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --no-build --wait
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
~~~

The app image runs Node 24 as a non-root user. Its root filesystem is read-only. Temporary folders use memory. The app has no persistent data volume. Caddy keeps certificate data in its named volumes and obtains HTTPS certificates for the domain. Only Caddy publishes ports 80 and 443. One app process preserves the current in-memory limits; do not add replicas without shared limits.

The Docker context allows only build inputs. It excludes .env files, evidence, Git data, dependencies, local build output and PPTX files. The final image contains the standalone server and local static assets. No real key is needed to build it.

## Privacy and operations

Do not enable HTTP access logs, request-body capture, debug logging, APM payload capture or session recording. Caddy's supplied configuration has no access-log directive. App and proxy operational logs have a size limit; this does not mean no system data is ever stored. Provider policy remains separate.

Do not use docker compose config without --quiet in shared output: expanded configuration can include secrets. Do not paste docker inspect output or secret files into a ticket. The server admin and Docker administrators can access runtime secrets.

Use Alibaba server status checks and the container health check for availability. The health check reads the page; it makes no paid AI call. A failed health check alone does not restart a running Docker container; inspect it and restart after diagnosis. A stopped process uses the restart policy. CPU, memory, disk, certificate renewal and billing alerts need final server checks.

## Stop, rotate and roll back

To disable AI access, set PILOT_ENABLED=false in deploy/server.env and recreate app. This stops new access and model requests; already active provider requests can still finish. To stop those requests as well, stop the app service.

~~~sh
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --no-build --force-recreate app
~~~

To revoke old invites and sessions, replace PILOT_INVITE_SECRET and increase PILOT_VERSION, then recreate app. Set a new SESSION_SECRET if session signing must also be revoked. Keep all changes in the server editor. Do not log the invite URL.

Before an update, retain the current commit-specific app image and the small configuration files privately. For rollback, set SLIDEREADY_IMAGE to the previous tag in deploy/.env and recreate app with --no-build. Confirm the app is healthy. Do not run docker image prune or docker compose down --volumes during the trial; the old image and HTTPS certificate volumes are needed for recovery.

Updates restart the app and reset the soft daily counter and request-rate counters. Existing browser reviews can fail during a restart. Schedule updates outside active reviews.

## Make the private invite

After the hosted checks pass, make https://YOUR_DOMAIN/#invite=PRIVATE_TOKEN in a private message draft. YOUR_DOMAIN is SITE_HOST from deploy/.env. PRIVATE_TOKEN is the exact PILOT_INVITE_SECRET from deploy/server.env. Read the secret in the server editor; do not print it or put the URL in logs. npm run invite reads the local .env.local file and does not make the hosted invite. Do not send the draft until the user asks you to send it.

## Final checks before Wayne

- HTTPS certificate, redirects and security headers work on the chosen domain.
- No direct public access to port 3100; server firewall and SSH restrictions are checked.
- Private invite works in a fresh browser; no invite means no AI access. The same original invite works on a second admin's computer. Rotate it and confirm old sessions are denied.
- English and Simplified Chinese, file reading, AI calls, error states, copy actions, reset and feedback work on the final site.
- Use an invented unique test sentence to check that app/proxy logs and files contain no lesson content. Check paid-call failures as well. Review provider policy separately.
- Full release/security gate is complete. Review the known development dependency warning rather than assuming an earlier audit is current.
- Test Guangzhou school Wi-Fi and mobile data without a VPN. Record review speed and any failure.
- Keep the unexplained intermittent JSON issue in the pilot record. The latest quality checks pass, but there is no proven root-cause fix.

Sources checked 5 October 2026:

- [Alibaba server setup](https://www.alibabacloud.com/help/en/simple-application-server/user-guide/create-a-server)
- [Alibaba images](https://www.alibabacloud.com/help/en/simple-application-server/product-overview/images)
- [Alibaba instance families](https://www.alibabacloud.com/help/en/simple-application-server/product-overview/instance-families/)
- [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Compose plugin](https://docs.docker.com/compose/install/linux/)
- [Caddy HTTPS](https://caddyserver.com/docs/automatic-https)
- Next.js standalone output and self-hosting guides bundled with this repo's installed Next.js.
