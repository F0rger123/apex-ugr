import { onRequest } from "../functions/api/[[path]]";

type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  APEX_ENVIRONMENT?: string;
  APEX_D1_NAME?: string;
  APEX_R2_BUCKET?: string;
  CF_PAGES_BRANCH?: string;
  CF_PAGES_COMMIT_SHA?: string;
  CF_PAGES_URL?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/^\//, "");
    const params = { path: path ? path.split("/") : [] };
    return onRequest({
      request,
      env: {
        ...env,
        APEX_ENVIRONMENT: env.APEX_ENVIRONMENT || "QA",
        APEX_D1_NAME: env.APEX_D1_NAME || "apex-ugr-pr23-qa",
        APEX_R2_BUCKET: env.APEX_R2_BUCKET || "apex-ugr-pr23-qa-media",
        CF_PAGES_BRANCH: env.CF_PAGES_BRANCH || "fix/mobile-ux-real-data",
        CF_PAGES_COMMIT_SHA: env.CF_PAGES_COMMIT_SHA || "local-qa-worker",
        CF_PAGES_URL: env.CF_PAGES_URL || url.origin,
      },
      params,
      waitUntil: ctx.waitUntil.bind(ctx),
      passThroughOnException() {},
      next: () => new Response("Not found.", { status: 404 }),
      data: {},
      functionPath: "/api/[[path]]",
    } as any);
  },
};
