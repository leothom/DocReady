# Stage 1 connection check

Status: PASS. Confirmed by the user's test screenshot on 5 October 2026.

- Provider: DeepSeek.
- Model requested: deepseek-flash.
- Route: browser -> local SlideReady server -> https://api.deepseek.com/responses.
- Request: one fixed test sentence. No school slide text.
- Result: exact structured result passed local validation.
- Time: 1.0 second. Input tokens: 113. Output tokens: 20.
- The permanent key stays in the server's environment. It is not returned to the browser.
- The route requires a signed session cookie and the configured Origin.
- Access, expiry, key rotation, timeout, malformed output and request limit tests pass.

This is a local connection test. It does not prove mainland hosting, provider retention, school network access or the final HTTPS link.

## Approved provider change

The user selected DeepSeek instead of Qwen. DeepSeek does not supply the temporary browser-key route used in the first plan. The approved current route uses a server relay. The original PPTX stays in the browser. Later review stages will send extracted text through the server to DeepSeek.

SlideReady must not save slide text, findings or request bodies. Provider policy is separate. Do not say that no data is stored anywhere.

Sources checked for setup:
- https://api-docs.deepseek.com/api/create-response/
- https://api-docs.deepseek.com/guides/responses_api/
- https://cdn.deepseek.com/policies/zh-CN/deepseek-open-platform-terms-of-service.html
