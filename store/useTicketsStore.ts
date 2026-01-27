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

const MAX_AI_HISTORY = 5;

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

    const normalizedTickets = storedTickets.map((ticket) => {
      const existingHistory = ticket.aiOutputHistory ?? [];
      let normalizedHistory = existingHistory;

      const historyMissingVersion = normalizedHistory.some(
        (item) => typeof item.version !== "number",
      );
      if (historyMissingVersion && normalizedHistory.length > 0) {
        const sortedByDate = [...normalizedHistory].sort((a, b) => {
          const aTime = new Date(a.generatedAt).getTime();
          const bTime = new Date(b.generatedAt).getTime();
          const safeATime = Number.isNaN(aTime) ? 0 : aTime;
          const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
          return safeATime - safeBTime;
        });
        normalizedHistory = sortedByDate.map((item, index) => ({
          ...item,
          version: index + 1,
        }));
      }

      const normalizedLatest = ticket.aiOutput
        ? {
            ...ticket.aiOutput,
            version:
              ticket.aiOutput.version ??
              ticket.aiOutputVersionCounter ??
              1,
          }
        : undefined;

      const versionCounterCandidates = [
        normalizedLatest?.version ?? 0,
        ...normalizedHistory.map((item) => item.version),
        ticket.aiOutputVersionCounter ?? 0,
      ];
      const maxVersion = versionCounterCandidates.length
        ? Math.max(...versionCounterCandidates)
        : 0;

      const original = normalizedHistory.find((item) => item.version === 1);
      const rest = normalizedHistory
        .filter((item) => item.version !== 1)
        .sort((a, b) => a.version - b.version);
      const keepTail = rest.slice(-(MAX_AI_HISTORY - 1));
      const trimmedHistory = original
        ? [original, ...keepTail]
        : keepTail;

      return {
        ...ticket,
        aiOutput: normalizedLatest,
        aiOutputHistory: trimmedHistory,
        aiOutputVersionCounter: maxVersion || normalizedLatest?.version,
      };
    });
    set({ tickets: normalizedTickets, isHydrated: true });
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
    if (!currentTicket) {
      return null;
    }

    const baseVersion =
      currentTicket.aiOutputVersionCounter ??
      currentTicket.aiOutput?.version ??
      0;
    const nextVersion = baseVersion + 1;
    const nextLatest: TicketAiOutput = { ...output, version: nextVersion };

    const previousOutput = currentTicket.aiOutput;
    const existingHistory = currentTicket.aiOutputHistory ?? [];
    const nextHistory = previousOutput
      ? [...existingHistory, previousOutput]
      : existingHistory;

    const uniqueByVersion = new Map<number, TicketAiOutput>();
    nextHistory.forEach((item) => {
      uniqueByVersion.set(item.version, item);
    });
    const normalizedHistory = Array.from(uniqueByVersion.values()).sort(
      (a, b) => a.version - b.version,
    );

    const original = normalizedHistory.find((item) => item.version === 1);
    const rest = normalizedHistory.filter((item) => item.version !== 1);
    const keepTail = rest.slice(-(MAX_AI_HISTORY - 1));
    const trimmedHistory = original ? [original, ...keepTail] : keepTail;

    const patch: Partial<Ticket> = {
      aiOutput: nextLatest,
      aiOutputHistory: trimmedHistory,
      aiOutputVersionCounter: nextVersion,
      status: "Resolved",
    };

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
          aiOutput: nextLatest,
          aiOutputHistory: trimmedHistory,
          aiOutputVersionCounter: nextVersion,
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
      nextHistory = updatedHistory.slice(-MAX_AI_HISTORY);
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
