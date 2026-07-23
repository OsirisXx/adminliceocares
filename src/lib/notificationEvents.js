export const TICKET_OPENED_EVENT = "liceo-cares:ticket-opened";

export const notifyTicketOpened = (complaint) => {
  if (typeof window === "undefined" || !complaint?.id) return;

  window.dispatchEvent(
    new CustomEvent(TICKET_OPENED_EVENT, {
      detail: {
        complaintId: complaint.id,
        referenceNumber: complaint.reference_number,
      },
    })
  );
};
