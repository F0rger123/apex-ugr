import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const api = readFileSync(resolve(root, "functions/api/[[path]].ts"), "utf8");
const app = readFileSync(resolve(root, "src/v2/ApexDesignPreview.tsx"), "utf8");
const workflow = readFileSync(resolve(root, ".github/workflows/android-apk.yml"), "utf8");

assert.match(api, /const PRODUCTION_D1_NAME = "apex-ugr-db"/);
assert.match(api, /const PRODUCTION_R2_BUCKET = "apex-ugr-media"/);
assert.match(api, /const QA_D1_NAME = "apex-ugr-pr23-qa"/);
assert.match(api, /const QA_R2_BUCKET = "apex-ugr-pr23-qa-media"/);
assert.match(api, /QA_BINDING_MISMATCH/);
assert.match(api, /QA_DOWNLOAD_DISABLED/);

assert.match(app, /const IS_QA_BUILD=apexApiEnvironment\.toUpperCase\(\)==='QA'/);
assert.match(app, /PUBLIC UPDATE CHECK DISABLED/);
assert.match(app, /function QaBuildBadge\(\)/);
assert.match(app, /PR23 QA/);

assert.match(workflow, /Validate QA build target/);
assert.match(workflow, /apex-ugr-pr23-qa\.pages\.dev/);
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);

console.log("QA safety regression passed.");
