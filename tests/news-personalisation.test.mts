import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPostInAudience, resolveFeedAudience } from "../src/lib/news/feed-query.ts";

const cruise = "topic-cruise";
const aviation = "topic-aviation";
const regulation = "topic-regulation";
const platformUpdates = "topic-platform-updates";

const defaultTopicIds = [cruise, aviation, regulation];

describe("feed audience", () => {
  it("gives a member who follows nothing the balanced default feed", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [],
      mandatoryTopicIds: [platformUpdates],
    });

    assert.equal(audience.mode, "default");
    assert.deepEqual(audience.topicIds.sort(), [...defaultTopicIds, platformUpdates].sort());
    assert.deepEqual(audience.sourceIds, []);
  });

  it("narrows to what a member follows once they have chosen", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [cruise],
      mandatoryTopicIds: [platformUpdates],
    });

    assert.equal(audience.mode, "personalised");
    assert.deepEqual(audience.topicIds.sort(), [cruise, platformUpdates].sort());
    // Following cruise must not drag the whole default set back in.
    assert.ok(!audience.topicIds.includes(aviation));
  });

  it("treats a followed publisher as a reason to receive a post", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: ["source-seatrade"],
      followedTopicIds: [],
      mandatoryTopicIds: [],
    });

    assert.equal(audience.mode, "personalised");
    assert.deepEqual(audience.sourceIds, ["source-seatrade"]);
  });

  it("does not repeat a topic that is followed and mandatory", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [platformUpdates],
      mandatoryTopicIds: [platformUpdates],
    });

    assert.deepEqual(audience.topicIds, [platformUpdates]);
  });
});

describe("feed segmentation", () => {
  const cruisePost = { sourceId: "source-seatrade", topicIds: [cruise] };
  const aviationPost = { sourceId: "source-aviation-wire", topicIds: [aviation] };
  const platformPost = { sourceId: "source-platform", topicIds: [platformUpdates] };
  const multiTopicPost = { sourceId: "source-trade", topicIds: [cruise, regulation] };

  it("delivers cruise news to a member who follows cruise", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [cruise],
      mandatoryTopicIds: [platformUpdates],
    });

    assert.equal(isPostInAudience(cruisePost, audience), true);
    assert.equal(isPostInAudience(multiTopicPost, audience), true);
  });

  it("keeps cruise news out of the feed of a member who does not follow it", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [aviation],
      mandatoryTopicIds: [platformUpdates],
    });

    assert.equal(isPostInAudience(cruisePost, audience), false);
    assert.equal(isPostInAudience(aviationPost, audience), true);
  });

  it("still delivers platform announcements to everyone", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [aviation],
      mandatoryTopicIds: [platformUpdates],
    });

    assert.equal(isPostInAudience(platformPost, audience), true);
  });

  it("delivers everything from a followed publisher, whatever the topic", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: ["source-seatrade"],
      followedTopicIds: [aviation],
      mandatoryTopicIds: [],
    });

    assert.equal(isPostInAudience(cruisePost, audience), true);
  });

  it("shows a new member a useful feed rather than an empty one", () => {
    const audience = resolveFeedAudience({
      defaultTopicIds,
      followedSourceIds: [],
      followedTopicIds: [],
      mandatoryTopicIds: [platformUpdates],
    });

    for (const post of [cruisePost, aviationPost, platformPost, multiTopicPost]) {
      assert.equal(isPostInAudience(post, audience), true);
    }
  });
});
