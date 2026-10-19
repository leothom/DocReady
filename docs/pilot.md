# Wayne's private trial

Status: draft. No remote link is ready. Do not send the invite until the final hosted path and school-network checks pass and the user authorizes sending it.

The user approved the supplied English/Chinese review pack and three Chinese wording changes. Later unseen AI outputs are not covered by that approval. Five permitted real decks passed three coverage runs; latest invented corpus passed 51 of 51 cases. The older intermittent JSON failure is still unexplained. Invalid output is rejected and failed content is shown as incomplete.

## Access and sharing

Wayne first opens the private HTTPS invite on his own computer. No account is needed. The server key stays on the server. The URL takes the form https://YOUR_DOMAIN/#invite=PRIVATE_TOKEN.

For the hosted invite, replace YOUR_DOMAIN with SITE_HOST from deploy/.env. Replace PRIVATE_TOKEN with the exact PILOT_INVITE_SECRET from deploy/server.env. Use the server editor to read that value privately. Do not print the invite in a terminal or log. The local npm run invite command reads .env.local and makes a local link; do not use it to make the hosted invite. Keep the finished invite in the private message draft until the hosted checks pass.

The app consumes and removes the invite fragment after access. Wayne must forward the ORIGINAL invite from the message, not copy the cleaned address bar. Test the original invite on another admin's computer. A Copy private invite button is a proposed improvement, not yet implemented. Do not claim the app already has it.

The teacher selects a subject and TOEFL level, reads a PPTX locally, then starts AI review. Corrections and optional suggestions have English and Simplified Chinese explanations. Accept keeps a choice in the session; it does not edit the PPTX. Copy text allows a manual slide edit. Browser refresh clears review content.

The original PPTX, notes, images and filename are not sent. Editable slide text passes through the Hong Kong app server to DeepSeek. SlideReady does not save that text or results. Provider policy is separate. Do not claim that no data is stored anywhere.

## Before the invite

Use docs/deploy.md to check final HTTPS, privacy settings, private access, invite rotation, other-computer sharing and Guangzhou access. Check the app in both languages. Test on school Wi-Fi and mobile data without a VPN. Record timings and failures without saving school source or findings.

Ask the teacher to inspect meaning, missing corrections, protected terms and optional benefits. Download feedback only if useful; it contains aggregate counts and metrics rather than lesson text. Do not use feedback to claim measured model accuracy or unique user counts.

## Draft invite

Wayne, your request for clear and correct English in teaching slides helped start SlideReady.

Open this private link on your computer: [INSERT VERIFIED INVITE]. You can forward this original link to other admins. Select a PowerPoint file, choose the subject and student level, then start the review. Use English or Simplified Chinese.

Your original file stays on your computer. Its editable slide text goes through the Hong Kong server to DeepSeek. SlideReady does not save the text or results. The AI provider's policy also applies.

Please tell us if a suggestion changes the lesson meaning or misses a clear error. I can also give a demo on Leo's computer.
