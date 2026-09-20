import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return <EmptyState title="Not found" hint="This page does not exist or was removed." action={<LinkButton href="/sessions">Sessions</LinkButton>} />;
}
