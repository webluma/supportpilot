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
  restoreAiOutputVersion: (id: string, historyIndex: number) => Ticket | null;
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
    const currentTicket = get().tickets.find((ticket) => ticket.id === id);
    const previousOutput = currentTicket?.aiOutput;
    const existingHistory = currentTicket?.aiOutputHistory ?? [];
    let nextHistory: TicketAiOutput[] | undefined;

    if (previousOutput) {
      const updatedHistory = [...existingHistory, previousOutput];
      nextHistory = updatedHistory.slice(-5);
    } else if (existingHistory.length > 0) {
      nextHistory = existingHistory;
    }

    const patch: Partial<Ticket> = {
      aiOutput: output,
      status: "Resolved",
    };
    if (nextHistory) {
      patch.aiOutputHistory = nextHistory;
    }

    const persistedTicket = updateTicketRecord(id, patch);
    if (!persistedTicket) {
      return null;
    }

    const now = new Date().toISOString();
    let updatedTicket: Ticket | null = null;

    set((state) => ({
      tickets: state.tickets.map((ticket) => {
        if (ticket.id !== id) {
          return ticket;
        }
        const nextTicket: Ticket = {
          ...ticket,
          aiOutput: output,
          aiOutputHistory: nextHistory ?? ticket.aiOutputHistory,
          status: "Resolved",
          updatedAt: now,
        };
        updatedTicket = nextTicket;
        return nextTicket;
      }),
    }));

    return updatedTicket ?? persistedTicket;
  },
  restoreAiOutputVersion: (id, historyIndex) => {
    const currentTicket = get().tickets.find((ticket) => ticket.id === id);
    const history = currentTicket?.aiOutputHistory ?? [];
    if (!currentTicket || history.length === 0) {
      return null;
    }
    if (historyIndex < 0 || historyIndex >= history.length) {
      return null;
    }

    const restoredOutput = history[historyIndex];
    let nextHistory = history;
    if (currentTicket.aiOutput) {
      const updatedHistory = [...history, currentTicket.aiOutput];
      nextHistory = updatedHistory.slice(-5);
    }

    const persistedTicket = updateTicketRecord(id, {
      aiOutput: restoredOutput,
      aiOutputHistory: nextHistory,
    });
    if (!persistedTicket) {
      return null;
    }

    const now = new Date().toISOString();
    let updatedTicket: Ticket | null = null;

    set((state) => ({
      tickets: state.tickets.map((ticket) => {
        if (ticket.id !== id) {
          return ticket;
        }
        const nextTicket: Ticket = {
          ...ticket,
          aiOutput: restoredOutput,
          aiOutputHistory: nextHistory,
          updatedAt: now,
        };
        updatedTicket = nextTicket;
        return nextTicket;
      }),
    }));

    return updatedTicket ?? persistedTicket;
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
