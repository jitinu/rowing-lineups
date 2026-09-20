import { ArrowLeftRight } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/ui";
import { diffLineups } from "@/domain/diff";
import { getLineupSnapshot, listRowers, listSessionsWithLineups } from "@/lib/queries";

import { ComparePicker } from "./compare-picker";
import { DiffView } from "./diff-view";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const sessions = await listSessionsWithLineups();
  const withLineups = sessions.filter((s) => s.lineups.length > 0);

  const [snapA, snapB, rowers] = await Promise.all([
    a ? getLineupSnapshot(a) : null,
    b ? getLineupSnapshot(b) : null,
    a && b ? listRowers({ includeInactive: true }) : [],
  ]);

  const diff =
    snapA && snapB
      ? diffLineups({
          before: snapA.assignments,
          after: snapB.assignments,
          rowers,
          beforeConfigs: snapA.boatConfigs,
          afterConfigs: snapB.boatConfigs,
        })
      : null;

  return (
    <>
      <PageHeader title="Compare" />
      {withLineups.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight className="size-6" />} title="Nothing to compare" hint="Build a lineup in a session first." />
      ) : (
        <div className="space-y-6">
          <ComparePicker sessions={withLineups} a={snapA ? a ?? null : null} b={snapB ? b ?? null : null} />
          {diff && snapA && snapB ? (
            <DiffView diff={diff} a={snapA} b={snapB} rowers={rowers} />
          ) : (
            <p className="py-8 text-center text-xs text-text-3">Pick two lineups</p>
          )}
        </div>
      )}
    </>
  );
}
