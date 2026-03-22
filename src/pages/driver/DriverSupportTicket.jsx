import { useParams } from 'react-router-dom';

export default function DriverSupportTicket() {
  const { ticketId } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Support Ticket {ticketId}</h1>
    </div>
  );
}
