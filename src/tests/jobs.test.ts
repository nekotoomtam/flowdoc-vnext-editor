import { describe, expect, it } from "vitest"
import { applyEditorJobResult } from "../editor/jobs/jobResults"
import { createJobQueueState, enqueueEditorJob } from "../editor/jobs/jobQueue"
import { getActiveJobs, getJobCounts } from "../editor/jobs/jobSelectors"
import type { EditorJobRequest } from "../editor/jobs/jobTypes"

const LIVE_LAYOUT_REQUEST: EditorJobRequest = {
  dedupeKey: "layout.live:qa-scroll",
  kind: "layout.live",
  priority: "visible",
  reason: "scroll-stability-check",
  requestRevision: 3,
  target: {
    nodeIds: ["qa-scroll"],
  },
}

describe("jobs foundation", () => {
  it("creates queued jobs with active status counts", () => {
    const queued = enqueueEditorJob(createJobQueueState(), LIVE_LAYOUT_REQUEST, 100)

    expect(queued.deduped).toBe(false)
    expect(queued.job).toMatchObject({
      createdAt: 100,
      dedupeKey: "layout.live:qa-scroll",
      id: "job-1-layout-live",
      kind: "layout.live",
      status: "queued",
    })
    expect(queued.state.revision).toBe(1)
    expect(getActiveJobs(queued.state)).toHaveLength(1)
    expect(getJobCounts(queued.state)).toMatchObject({
      active: 1,
      queued: 1,
      total: 1,
    })
  })

  it("dedupes active jobs by dedupe key", () => {
    const first = enqueueEditorJob(createJobQueueState(), LIVE_LAYOUT_REQUEST, 100)
    const second = enqueueEditorJob(first.state, LIVE_LAYOUT_REQUEST, 200)

    expect(second.deduped).toBe(true)
    expect(second.job).toBe(first.job)
    expect(second.state).toBe(first.state)
    expect(second.state.jobs).toHaveLength(1)
  })

  it("applies terminal job results without rerunning work", () => {
    const queued = enqueueEditorJob(createJobQueueState(), LIVE_LAYOUT_REQUEST, 100)
    const completed = applyEditorJobResult(queued.state, {
      changed: {
        nodeIds: ["qa-scroll"],
      },
      jobId: queued.job.id,
      producedRevision: 4,
      status: "completed",
      summary: "Live layout placeholder completed",
    })
    const next = enqueueEditorJob(completed, LIVE_LAYOUT_REQUEST, 200)

    expect(completed.jobs[0]).toMatchObject({
      id: queued.job.id,
      status: "completed",
    })
    expect(getJobCounts(completed)).toMatchObject({
      active: 0,
      completed: 1,
      total: 1,
    })
    expect(next.deduped).toBe(false)
    expect(next.state.jobs).toHaveLength(2)
  })
})
