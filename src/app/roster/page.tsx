import { Users } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { listRowers } from "@/lib/queries";

import { RosterTable } from "./roster-table";
import { RowerDialog } from "./rower-dialog";

export default async function RosterPage() {
  const [rowers, viewer] = await Promise.all([listRowers({ includeInactive: true }), getViewer()]);
  const canEdit = !!viewer.coach;
  return (
    <>
      <PageHeader title="Roster">{canEdit ? <RowerDialog /> : null}</PageHeader>
      {rowers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No rowers yet"
          hint={canEdit ? "Add the first rower or coxswain." : "Sign in as a coach to build the roster."}
        />
      ) : (
        <RosterTable rowers={rowers} canEdit={canEdit} />
      )}
    </>
  );
}
