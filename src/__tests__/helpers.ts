import type { TestStep } from "../types.js";

export function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export function errorResponse(statusText: string, status = 500) {
  return new Response(null, { status, statusText });
}

export function textResponse(body: string, status = 500) {
  return new Response(body, { status });
}

export function sseStream(...chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

export const baseProject = {
  id: 1,
  name: "P1",
  description: null,
  base_url: "http://app.test",
  config: null,
  base_prompt: null,
  page_load_state: "load",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const baseTestCase = {
  id: 10,
  project_id: 1,
  name: "TC1",
  description: null,
  natural_query: "do thing",
  steps: '[{"action":"goto","target":"/","value":null}]',
  expected_result: null,
  tags: '["a"]',
  fixture_ids: "[5]",
  priority: "low",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: null,
};

export const baseFixture = {
  id: 11,
  project_id: 1,
  name: "F1",
  description: null,
  setup_steps: '[{"action":"goto","target":"/login","value":null}]',
  scope: "test",
  cache_ttl_seconds: 60,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const sampleSteps: TestStep[] = [{ action: "goto", target: "/", value: null }];

export const RUN_COMPLETED_EVENT =
  '{"type":"run_completed","run_id":1,"status":"passed","pass_count":1,"error_count":0,"summary":"ok","retry_attempt":0,"max_retries":0}';

export const RUN_STARTED_EVENT =
  '{"type":"run_started","run_id":1,"test_case_id":2,"total_steps":1,"retry_attempt":0,"max_retries":0,"original_run_id":null}';

export const BUILD_RESPONSE = {
  message: null,
  needs_clarification: false,
  test_case: {
    name: "x",
    natural_query: "q",
    priority: "high",
    tags: [],
    steps: [],
    fixture_ids: [],
  },
};
