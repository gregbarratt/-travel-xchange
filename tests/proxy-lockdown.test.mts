import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NextRequest } from "next/server.js";

import { proxy } from "../src/proxy.ts";

describe("logged-out route protection proxy", () => {
  it("redirects protected platform pages to login before private pages render", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/dashboard"));

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/login?next=%2Fdashboard",
    );
  });

  it("keeps public login available", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/login"));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  });

  it("keeps pricing hidden from logged-out users", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/pricing"));

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/login?next=%2Fpricing",
    );
  });
});
