"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Eraser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button, EmptyState, ErrorNotice, Spinner } from "@/components/ui";
import { allBoatBalances } from "@/domain/balance";
import { riggingForBoat } from "@/domain/rigging";
import { type AvailabilityStatus, type BoatNumber, BOAT_NUMBERS, type Rower, type Seat, SEATS } from "@/domain/types";
import { validateLineup } from "@/domain/validation";
import {
  assignSeat,
  clearBoat,
  cloneLineup,
  createLineup,
  deleteLineup,
  renameLineup,
  reorderLineups,
  setPrimaryLineup,
  unassignSeat,
} from "@/lib/actions/lineups";
import type { ActionResult } from "@/lib/actions/result";
import { setAvailability } from "@/lib/actions/sessions";
import type { SessionBundle } from "@/lib/queries";

import { BoatCard } from "./boat-card";
import { LineupTabs } from "./lineup-tabs";
import { RosterSidebar } from "./roster-sidebar";
import { RowerChip } from "./rower-chip";

export interface LineupCanvasProps {
  bundle: SessionBundle;
  canEdit: boolean;
  initialLineupId?: string | null;
}

function parseSeatId(id: string): { boat: BoatNumber; seat: Seat } | null {
  const m = /^seat:(\d):(.+)$/.exec(id);
  if (!m) return null;
  const boat = Number(m[1]) as BoatNumber;
  const seat = m[2] as Seat;
  if (!BOAT_NUMBERS.includes(boat) || !SEATS.includes(seat)) return null;
  return { boat, seat };
}

export function LineupCanvas({ bundle, canEdit, initialLineupId }: LineupCanvasProps) {
  const router = useRouter();
  const { session, lineups, rowers, availability } = bundle;
  const [chosenId, setActiveId] = useState<string | null>(initialLineupId ?? null);
  const activeId = (chosenId && lineups.some((l) => l.id === chosenId) ? chosenId : null) ?? lineups.find((l) => l.is_primary)?.id ?? lineups[0]?.id ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Rower | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = lineups.find((l) => l.id === activeId) ?? null;
  const assignments = useMemo(() => bundle.assignments.filter((a) => a.lineup_id === activeId), [bundle.assignments, activeId]);
  const boatConfigs = useMemo(() => bundle.boatConfigs.filter((c) => c.lineup_id === activeId), [bundle.boatConfigs, activeId]);
  const rowerById = useMemo(() => new Map(rowers.map((r) => [r.id, r])), [rowers]);
  const activeRowers = useMemo(() => rowers.filter((r) => r.active), [rowers]);

  const flags = useMemo(
    () => (active ? validateLineup({ assignments, rowers, availability, boatConfigs }) : []),
    [active, assignments, rowers, availability, boatConfigs],
  );
  const balances = useMemo(() => allBoatBalances(assignments, rowers, boatConfigs), [assignments, rowers, boatConfigs]);
  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.rower_id)), [assignments]);

  const seatsByBoat = useMemo(() => {
    const map = new Map<BoatNumber, Map<Seat, Rower | undefined>>();
    for (const b of BOAT_NUMBERS) map.set(b, new Map());
    for (const a of assignments) map.get(a.boat_number)?.set(a.seat, rowerById.get(a.rower_id));
    return map;
  }, [assignments, rowerById]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function run(action: () => Promise<ActionResult<unknown>>, after?: (res: ActionResult<unknown>) => void) {
    setError(null);
    start(async () => {
      const res = await action();
      if (!res.ok) setError(res.error);
      after?.(res);
      router.refresh();
    });
  }

  function place(rowerId: string, boat: BoatNumber, seat: Seat) {
    if (!activeId) return;
    const current = assignments.find((a) => a.rower_id === rowerId);
    if (current && current.boat_number === boat && current.seat === seat) return;
    run(() => assignSeat({ lineupId: activeId, rowerId, boat, seat }));
  }

  function remove(rowerId: string) {
    if (!activeId) return;
    run(() => unassignSeat({ lineupId: activeId, rowerId }));
  }

  function onDragStart(e: DragStartEvent) {
    const rowerId = e.active.data.current?.rowerId as string | undefined;
    setDragging(rowerId ? rowerById.get(rowerId) ?? null : null);
    setSelected(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const rowerId = e.active.data.current?.rowerId as string | undefined;
    const over = e.over?.id;
    if (!rowerId || over == null) return;
    if (over === "roster") {
      if (assignedIds.has(rowerId)) remove(rowerId);
      return;
    }
    const target = parseSeatId(String(over));
    if (target) place(rowerId, target.boat, target.seat);
  }

  function onSeatClick(boat: BoatNumber, seat: Seat, occupant: Rower | undefined) {
    if (!canEdit) return;
    if (selected) {
      place(selected, boat, seat);
      setSelected(null);
    } else if (occupant) {
      setSelected(occupant.id);
    }
  }

  function onChipClick(rower: Rower) {
    setSelected((cur) => (cur === rower.id ? null : rower.id));
  }

  const lineupActions = {
    onSelect: (id: string) => {
      setActiveId(id);
      setSelected(null);
    },
    onCreate: () => run(() => createLineup(session.id, `Piece ${lineups.length + 1}`), (r) => r.ok && setActiveId((r.data as { id: string }).id)),
    onClone: (id: string) => {
      const src = lineups.find((l) => l.id === id);
      run(() => cloneLineup(id, `${src?.name ?? "Piece"} copy`), (r) => r.ok && setActiveId((r.data as { id: string }).id));
    },
    onRename: (id: string, name: string) => run(() => renameLineup(id, name)),
    onSetPrimary: (id: string) => run(() => setPrimaryLineup(id)),
    onMove: (id: string, dir: -1 | 1) => {
      const ids = lineups.map((l) => l.id);
      const i = ids.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      run(() => reorderLineups(session.id, ids));
    },
    onDelete: (id: string) => {
      if (!window.confirm("Delete this lineup?")) return;
      run(() => deleteLineup(id));
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <LineupTabs lineups={lineups} activeId={activeId} canEdit={canEdit} busy={pending} {...lineupActions} />
        {pending ? <Spinner className="ml-auto" /> : null}
      </div>
      {error ? <ErrorNotice message={error} /> : null}

      {!active ? (
        <EmptyState
          title="No lineups yet"
          hint={canEdit ? "Create the first piece to start seating." : "A coach has not built a lineup for this session."}
          action={canEdit ? <Button variant="primary" onClick={lineupActions.onCreate} disabled={pending}>New lineup</Button> : undefined}
        />
      ) : (
        <DndContext id="lineup-dnd" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
            <div className="grid gap-3 sm:grid-cols-2" data-lineup-id={active.id}>
              {BOAT_NUMBERS.map((b) => (
                <BoatCard
                  key={b}
                  boat={b}
                  name={boatConfigs.find((c) => c.boat_number === b)?.name ?? null}
                  rigging={riggingForBoat(b, boatConfigs)}
                  seats={seatsByBoat.get(b)!}
                  flags={flags}
                  balance={balances[b - 1]}
                  canEdit={canEdit}
                  selectedRowerId={selected}
                  onSeatClick={(seat, occupant) => onSeatClick(b, seat, occupant)}
                  headerExtra={
                    canEdit && (seatsByBoat.get(b)?.size ?? 0) > 0 ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Clear boat ${b}`}
                        title="Clear boat"
                        disabled={pending}
                        onClick={() => run(() => clearBoat(active.id, b))}
                      >
                        <Eraser className="size-3.5" />
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </div>
            <RosterSidebar
              rowers={activeRowers}
              assignedIds={assignedIds}
              availability={availability}
              canEdit={canEdit}
              selectedRowerId={selected}
              onChipClick={onChipClick}
              onAvailability={(rower: Rower, status: AvailabilityStatus | null) =>
                run(() => setAvailability({ sessionId: session.id, rowerId: rower.id, status }))
              }
            />
          </div>
          <DragOverlay dropAnimation={null}>
            {dragging ? <RowerChip rower={dragging} dragId="overlay" disabled className="shadow-md" /> : null}
          </DragOverlay>
        </DndContext>
      )}
      {selected && canEdit ? (
        <p className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 py-2 text-center text-xs text-text-2 backdrop-blur sm:hidden">
          Tap a seat to place {rowerById.get(selected)?.name ?? "rower"}
          <button type="button" className="ml-3 underline" onClick={() => setSelected(null)}>
            Cancel
          </button>
        </p>
      ) : null}
    </div>
  );
}
