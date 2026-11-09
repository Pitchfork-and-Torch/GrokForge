// Chart view for TaskLifecycle.tla. Labels are in the words of a GrokForge
// creator or builder: what they would see on the project page, the review
// queue, and the ledger. Variable names stay out of labels.

const seq = (s) => Object.keys(s ?? {}).map((k) => s[k]);

const facts = (v) => {
  const claims = seq(v.claims);
  const contribs = seq(v.contribs);
  const reviews = seq(v.reviews);
  const pcs = Object.values(v.pc ?? {});
  const dupReview = reviews.some((a, i) =>
    reviews.some((b, j) => j > i && a.contrib === b.contrib && a.reviewer === b.reviewer),
  );
  return {
    task: v.taskStatus,
    project: v.projectStatus,
    holders: claims.filter((c) => c.active).length,
    pending: contribs.filter((c) => c.status === "PENDING").length,
    accepted: contribs.filter((c) => c.status === "ACCEPTED").length,
    rejected: contribs.filter((c) => c.status === "REJECTED").length,
    paidTwice: contribs.some((c) => c.credits > 1),
    dupReview,
    inFlight: {
      release: pcs.includes("release"),
      submit: pcs.includes("submit") || pcs.includes("submit_sync"),
      expire: pcs.includes("expire"),
      review: pcs.some((p) => p.startsWith("pr_")),
      decision: pcs.some((p) => p.startsWith("mod_")),
    },
    idle: pcs.every((p) => p === "idle"),
  };
};

const BASE = {
  OPEN: "Open",
  CLAIMED: "Claimed",
  SUBMITTED: "Submitted, in review",
  ACCEPTED: "Accepted, done",
};

export const state = (v) => {
  const f = facts(v);
  const parts = [BASE[f.task]];
  if (f.task === "OPEN" && f.rejected > 0 && f.pending === 0 && f.accepted === 0 && f.holders === 0)
    parts[0] = "Open again, sent back for rework";

  // Rules on the database between requests.
  if (f.idle) {
    if (f.task === "CLAIMED" && f.holders === 0) parts.push("nobody holds the claim");
    if (f.task !== "CLAIMED" && f.holders > 0) parts.push("a builder still holds a claim");
    if (f.task !== "SUBMITTED" && f.pending > 0) parts.push("work still waiting for review");
    if (f.task === "SUBMITTED" && f.pending === 0) parts.push("nothing to review");
    if (f.task !== "ACCEPTED" && f.accepted > 0) parts.push("accepted work exists");
    if (f.task === "ACCEPTED" && f.accepted === 0) parts.push("no accepted work");
    if (f.task === "ACCEPTED" && f.project !== "COMPLETED") parts.push("project not marked complete");
    if (f.task !== "ACCEPTED" && f.project === "COMPLETED") parts.push("project still marked complete");
  } else {
    const going = [];
    if (f.inFlight.release) going.push("release");
    if (f.inFlight.submit) going.push("submit");
    if (f.inFlight.expire) going.push("expiry");
    if (f.inFlight.review) going.push("peer review");
    if (f.inFlight.decision) going.push("creator decision");
    parts.push(`${going.join(" + ")} in progress`);
  }

  // Rules that hold at every moment.
  if (f.holders > 1) parts.push("two builders hold claims");
  if (f.pending > 1) parts.push("two submissions waiting");
  if (f.accepted > 1) parts.push("two accepted deliverables");
  if (f.paidTwice) parts.push("author paid twice");
  if (f.dupReview) parts.push("a reviewer counted twice");

  return parts.join(" · ");
};

export const group = (v) => BASE[v.taskStatus];

export const colors = {
  Open: "blue",
  Claimed: "yellow",
  "Submitted, in review": "purple",
  "Accepted, done": "teal",
};

// The session whose statement ran in this step: its pc changed.
const mover = (from, to) => Object.keys(from.pc ?? {}).find((s) => from.pc[s] !== to.pc[s]);
const decided = (from, to) => from.local?.[mover(from, to)]?.accepted === true;

export const step = (action, from, to) => {
  switch (action) {
    case "ClaimCommit":
      return "a builder claims the task";
    case "ReleaseRead":
      return "a builder asks to release the claim";
    case "ReleaseCommit":
      return "the release is written";
    case "SubmitRead":
      return "a builder sends in work";
    case "SubmitCommit":
      if (from.taskStatus !== "CLAIMED") return "the submission is refused [task was not claimed]";
      return from.local?.[mover(from, to)]?.auto === true
        ? "the submission is saved and auto-accepted [strong worker]"
        : "the submission is saved";
    case "SubmitSync":
    case "PeerReviewSync":
    case "ModerateSync":
      return "the project status is recomputed";
    case "ExpireRead":
      return "the expiry job picks up a stale claim";
    case "ExpireCommit":
      return "the claim is expired";
    case "PeerReviewRead":
      return "a peer reviewer opens the submission";
    case "PeerReviewCreate":
      return "the peer review is saved";
    case "PeerReviewAvg":
      return "the review average is computed";
    case "PeerReviewWriteContrib":
      return decided(from, to)
        ? "peer review accepts the submission"
        : "peer review rejects the submission";
    case "PeerReviewWriteTask":
      return decided(from, to)
        ? "peer review marks the task accepted"
        : "peer review reopens the task";
    case "PeerReviewCredit":
    case "ModerateCredit":
      return decided(from, to) ? "the author is paid reputation" : "no reputation is paid [rejected]";
    case "ModerateRead":
      return "the creator opens the submission";
    case "ModerateWriteContrib":
      return decided(from, to)
        ? "the creator accepts the submission"
        : "the creator rejects the submission";
    case "ModerateWriteTask":
      return decided(from, to)
        ? "the creator's accept marks the task accepted"
        : "the creator's reject reopens the task";
    case "ModerateReview":
      return "the creator's review is saved";
    case "Reopen":
      return "the creator reopens the task for rework";
    default:
      return action;
  }
};

export const title = "GrokForge leaf task: claim, submit, review, accept";
