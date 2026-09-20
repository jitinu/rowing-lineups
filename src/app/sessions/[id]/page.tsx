import { ArrowLeftRight, Link2 } from "lucide-react";
import { notFound } from "next/navigation";

import { LineupCanvas } from "@/components/lineup/lineup-canvas";
import { NotesPanel } from "@/components/lineup/notes-panel";
import { Badge, LinkButton, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { formatDateLong } from "@/lib/format";
import { getSessionBundle } from "@/lib/queries";

import { SessionTitle } from "./session-title";
import { ShareButton } from "./share-button";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lineup?: string }>;
}) {
  const [{ id }, { lineup }, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const bundle = await getSessionBundle(id);
  if (!bundle) notFound();
  const canEdit = !!viewer.coach;
  const primary = bundle.lineups.find((l) => l.is_primary);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatDateLong(bundle.session.session_date)}</span>
            <Badge tone="outline">{bundle.session.slot}</Badge>
            <SessionTitle sessionId={bundle.session.id} title={bundle.session.title} canEdit={canEdit} />
          </span>
        }
      >
        <ShareButton sessionId={bundle.session.id} />
        {primary ? (
          <LinkButton size="sm" variant="ghost" href={`/compare?a=${primary.id}`}>
            <ArrowLeftRight className="size-3.5" aria-hidden />
            Compare
          </LinkButton>
        ) : null}
        {!canEdit ? (
          <Badge tone="neutral">
            <Link2 className="size-3" aria-hidden />
            Read only
          </Badge>
        ) : null}
      </PageHeader>

      <div className="space-y-8">
        <LineupCanvas bundle={bundle} canEdit={canEdit} initialLineupId={lineup ?? null} />
        <NotesPanel sessionId={bundle.session.id} notes={bundle.notes} coaches={bundle.coaches} myCoachId={viewer.coach?.id ?? null} />
      </div>
    </>
  );
}
