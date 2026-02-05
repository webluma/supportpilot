import TicketDetailsClient from "./TicketDetailsClient";

type TicketDetailsPageProps = {
  params: Promise<{
    id: string;
  }> | {
    id: string;
  };
};

export default async function TicketDetailsPage({
  params,
}: TicketDetailsPageProps) {
  const resolvedParams = await Promise.resolve(params);
  return <TicketDetailsClient key={resolvedParams.id} id={resolvedParams.id} />;
}
