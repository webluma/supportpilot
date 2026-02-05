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
const SETTINGS_STORAGE_KEY = "supportpilot:settings:v1";

const appendAuditToSettings = (eventType: string, detail: string) => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return;
    const currentLog = Array.isArray(parsed.auditLog) ? parsed.auditLog : [];
    const evt = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      eventType,
      actor: "You",
      detail,
      createdAt: new Date().toISOString(),
    };
    const nextLog = [evt, ...currentLog].slice(0, 20);
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...parsed, auditLog: nextLog }),
    );
  } catch {
    // fail silently
  }
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
    appendAuditToSettings("ticket.created", `Ticket ${newTicket.id} created`);
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
    const ticket = get().tickets.find((t) => t.id === id);
    const patch: Partial<Ticket> = { status };
    if (status === "Resolved" && !ticket?.resolvedAt) {
      patch.resolvedAt = new Date().toISOString();
    }
    const updated = get().updateTicket(id, patch);
    if (updated) {
      appendAuditToSettings("ticket.status_changed", `Ticket ${id} -> ${status}`);
    }
    return updated;
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
    const answeredAt =
      currentTicket.answeredAt ?? nextLatest.generatedAt ?? new Date().toISOString();

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
      answeredAt,
      resolvedAt: currentTicket.resolvedAt ?? new Date().toISOString(),
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
          answeredAt,
          resolvedAt: currentTicket.resolvedAt ?? now,
          updatedAt: now,
        };
        updatedTicket = nextTicket;
        return nextTicket;
      }),
    }));

    if (updatedTicket) {
      appendAuditToSettings("ai.generated", `AI output for ${id}`);
      appendAuditToSettings("ticket.status_changed", `Ticket ${id} -> Resolved`);
    }

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
