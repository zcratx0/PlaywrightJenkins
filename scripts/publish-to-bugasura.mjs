#!/usr/bin/env node
/**
 * Publishes failed tests from JUnit XML files to Bugasura.
 *
 * Reads one or more JUnit XML files (Jest, Playwright), collects every
 * <testcase> with <failure> or <error>, and creates/updates a Bugasura issue
 * per failure using a deterministic external_id so the same test failure
 * reuses the same issue across builds.
 *
 * Env vars (provided by Jenkins withCredentials + environment):
 *   BUGASURA_API_KEY       Required. Bearer token.
 *   BUGASURA_TEAM_ID       Required. Numeric team ID.
 *   BUGASURA_SPRINT_ID     Required. Numeric sprint ID.
 *   BUGASURA_API_URL       Optional. Defaults to https://api.bugasura.io/api/v1/issues.
 *
 * CLI flags:
 *   --junit-jest=PATH
 *   --junit-playwright=PATH
 *   --build=NUMBER
 *   --job=NAME
 *   --build-url=URL
 *   --report-url=URL      Optional link to HTML test report.
 *   --dry-run             Do not call the API, only log payloads.
 */

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

const ARGS = parseArgs(process.argv.slice(2));

const API_KEY = process.env.BUGASURA_API_KEY;
const TEAM_ID = process.env.BUGASURA_TEAM_ID;
const SPRINT_ID = process.env.BUGASURA_SPRINT_ID;
const API_URL = process.env.BUGASURA_API_URL || "https://api.bugasura.io/api/v1/issues";
const DRY_RUN = !!ARGS["dry-run"];

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=", 2);
      out[k] = v === undefined ? true : v;
    }
  }
  return out;
}

function fatal(msg) {
  console.error(`[bugasura] ${msg}`);
  process.exit(0); // never break the Jenkins build
}

function hash16(input) {
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function collectFailedTests(junitPath, framework) {
  if (!junitPath) return [];
  if (!existsSync(junitPath)) {
    console.warn(`[bugasura] JUnit file not found: ${junitPath} (skipping)`);
    return [];
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => ["testsuite", "testcase", "failure", "error"].includes(name),
  });

  const xml = readFileSync(junitPath, "utf8");
  const parsed = parser.parse(xml);
  const suites = asArray(parsed.testsuites?.testsuite);
  const failures = [];

  for (const suite of suites) {
    const suiteName = suite["@_name"] ?? "";
    const cases = asArray(suite.testcase);
    for (const tc of cases) {
      const caseName = tc["@_name"] ?? "";
      const classname = tc["@_classname"] ?? suiteName;
      const fail = asArray(tc.failure)[0];
      const err = asArray(tc.error)[0];
      const failure = fail || err;
      if (!failure) continue;

      const message = failure["@_message"] ?? "";
      const body = typeof failure === "object" ? failure["#text"] ?? "" : String(failure);
      const stacktrace = (body || message || "").trim();

      failures.push({
        framework,
        testFile: classname,
        testName: caseName,
        message,
        stacktrace,
      });
    }
  }
  return failures;
}

async function fetchExisting(externalId) {
  const url = `${API_URL}?external_id=${encodeURIComponent(externalId)}&team_id=${TEAM_ID}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (Array.isArray(json) && json.length > 0) return json[0];
    if (json && json.id) return json;
    return null;
  } catch (e) {
    console.warn(`[bugasura] GET failed for ${externalId}: ${e.message}`);
    return null;
  }
}

async function publish(payload) {
  if (DRY_RUN) {
    console.log(`[bugasura] DRY-RUN would POST: ${JSON.stringify(payload, null, 2)}`);
    return { status: "dry-run" };
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.warn(`[bugasura] POST ${res.status}: ${text.slice(0, 300)}`);
    return { status: "error", http: res.status };
  }
  console.log(`[bugasura] POST ${res.status}: ok`);
  return { status: "ok", http: res.status };
}

async function upsertIssue(failure) {
  const stableKey = `${ARGS.job ?? "job"}|${failure.testFile}|${failure.testName}`;
  const externalId = `jenkins-${hash16(stableKey)}`;

  const description = [
    `**Framework:** ${failure.framework}`,
    `**Build:** ${ARGS.build ?? "n/a"}`,
    `**Job:** ${ARGS.job ?? "n/a"}`,
    `**Build URL:** ${ARGS["build-url"] ?? "n/a"}`,
    ARGS["report-url"] ? `**Report:** ${ARGS["report-url"]}` : null,
    "",
    `**Test:** ${failure.testName}`,
    `**File:** ${failure.testFile}`,
    "",
    "**Stacktrace:**",
    "```",
    failure.stacktrace || failure.message || "(no stacktrace)",
    "```",
  ]
    .filter(Boolean)
    .join("\n");

  const base = {
    external_id: externalId,
    title: `[${ARGS.job ?? "jenkins"} #${ARGS.build ?? "?"}] ${failure.testName}`,
    description,
    type: "BUG",
    severity: "HIGH",
    team_id: Number(TEAM_ID),
    sprint_id: Number(SPRINT_ID),
    status: "OPEN",
    labels: ["automated", "jenkins", failure.framework],
    source: {
      build_number: ARGS.build ?? null,
      build_url: ARGS["build-url"] ?? null,
      test_file: failure.testFile,
      test_name: failure.testName,
      framework: failure.framework,
      message: failure.message,
    },
  };

  if (!API_KEY && !DRY_RUN) {
    console.warn("[bugasura] BUGASURA_API_KEY missing - skipping publish");
    return { status: "skipped", reason: "missing-key" };
  }

  const existing = await fetchExisting(externalId);
  if (existing && existing.id) {
    const patchUrl = `${API_URL}/${existing.id}`;
    if (DRY_RUN) {
      console.log(`[bugasura] DRY-RUN would PATCH ${patchUrl}`);
      return { status: "dry-run" };
    }
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ...base, id: existing.id }),
    });
    console.log(`[bugasura] PATCH ${res.status} (update existing issue ${existing.id})`);
    return { status: res.ok ? "updated" : "error", http: res.status };
  }

  return publish(base);
}

async function main() {
  if (!TEAM_ID || !SPRINT_ID) {
    fatal("BUGASURA_TEAM_ID and BUGASURA_SPRINT_ID are required");
    return;
  }

  const all = [
    ...collectFailedTests(ARGS["junit-jest"], "jest"),
    ...collectFailedTests(ARGS["junit-playwright"], "playwright"),
  ];

  if (all.length === 0) {
    console.log("[bugasura] No failed tests detected - nothing to publish.");
    return;
  }

  console.log(`[bugasura] Publishing ${all.length} failed test(s) to ${API_URL}`);

  for (const f of all) {
    try {
      await upsertIssue(f);
    } catch (e) {
      console.warn(`[bugasura] Unexpected error publishing ${f.testName}: ${e.message}`);
    }
  }
}

main().catch((e) => fatal(`Unhandled: ${e.message}`));