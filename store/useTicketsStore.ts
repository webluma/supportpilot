import { create } from "zustand";

import { createSeedTicketInput } from "@/lib/tickets/seed";
import {
  clearTickets,
  createTicket as createTicketRecord,
  deleteTicket as deleteTicketRecord,
  getTickets,
  updateTicket as updateTicketRecord,
} from "@/lib/tickets/repository";
import type {
  CreateTicketInput,
  Ticket,
  TicketAiOutput,
  TicketStatus,
} from "@/lib/tickets/types";

type TicketsState = {
  tickets: Ticket[];
  isHydrated: boolean;
  hydrateTickets: () => void;
  createTicket: (input: CreateTicketInput) => Ticket;
  updateTicket: (id: string, patch: Partial<Ticket>) => Ticket | null;
  updateTicketStatus: (id: string, status: TicketStatus) => Ticket | null;
  saveAiOutput: (id: string, output: TicketAiOutput) => Ticket | null;
  deleteTicket: (id: string) => boolean;
  clearAllTickets: () => void;
};

export const useTicketsStore = create<TicketsState>()((set, get) => ({
  tickets: [],
  isHydrated: false,
  hydrateTickets: () => {
    if (get().isHydrated) {
      return;
    }

    const storedTickets = getTickets();
    if (storedTickets.length === 0) {
      const seedTicket = createTicketRecord(createSeedTicketInput());
      set({ tickets: [seedTicket], isHydrated: true });
      return;
    }

    set({ tickets: storedTickets, isHydrated: true });
  },
  createTicket: (input) => {
    const newTicket = createTicketRecord(input);
    set((state) => ({ tickets: [newTicket, ...state.tickets] }));
    return newTicket;
  },
  updateTicket: (id, patch) => {
    const updatedTicket = updateTicketRecord(id, patch);
    if (!updatedTicket) {
      return null;
    }

    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === id ? updatedTicket : ticket,
      ),
    }));
    return updatedTicket;
  },
  updateTicketStatus: (id, status) => {
    return get().updateTicket(id, { status });
  },
  saveAiOutput: (id, output) => {
    const updatedTicket = updateTicketRecord(id, {
      aiOutput: output,
      status: "Resolved",
    });
    if (!updatedTicket) {
      return null;
    }

    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === id ? updatedTicket : ticket,
      ),
    }));
    return updatedTicket;
  },
  deleteTicket: (id) => {
    const didDelete = deleteTicketRecord(id);
    if (!didDelete) {
      return false;
    }

    set((state) => ({
      tickets: state.tickets.filter((ticket) => ticket.id !== id),
    }));
    return true;
  },
  clearAllTickets: () => {
    clearTickets();
    set({ tickets: [] });
  },
}));
