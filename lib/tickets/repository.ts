import type { CreateTicketInput, Ticket, TicketEnvironment } from "./types";

const STORAGE_KEY = "supportpilot:tickets:v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readTickets(): Ticket[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Ticket[]) : [];
  } catch {
    return [];
  }
}

function writeTickets(tickets: Ticket[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function generateId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `ticket_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function detectEnvironment(): TicketEnvironment {
  if (typeof navigator === "undefined") {
    return {};
  }

  const userAgent = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(userAgent);
  const deviceType = isMobile ? "Mobile" : "Desktop";

  let os: string | undefined;
  if (/Windows/i.test(userAgent)) {
    os = "Windows";
  } else if (/Android/i.test(userAgent)) {
    os = "Android";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = "iOS";
  } else if (/Mac OS X/i.test(userAgent)) {
    os = "macOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  }

  let browser: string | undefined;
  if (/Edg\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/Chrome\//i.test(userAgent)) {
    browser = "Chrome";
  } else if (/Firefox\//i.test(userAgent)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(userAgent)) {
    browser = "Safari";
  }

  return {
    browser,
    os,
    deviceType,
    userAgent,
  };
}

function mergeEnvironment(
  detected: TicketEnvironment,
  provided?: TicketEnvironment,
): TicketEnvironment {
  if (!provided) {
    return detected;
  }

  const merged: TicketEnvironment = { ...detected };
  (Object.entries(provided) as Array<[keyof TicketEnvironment, string | undefined]>).forEach(
    ([key, value]) => {
      if (value !== undefined) {
        merged[key] = value;
      }
    },
  );

  return merged;
}

export function getTickets(): Ticket[] {
  return readTickets();
}

export function getTicketById(id: string): Ticket | null {
  const tickets = readTickets();
  return tickets.find((ticket) => ticket.id === id) ?? null;
}

export function saveTickets(tickets: Ticket[]): void {
  writeTickets(tickets);
}

export function createTicket(input: CreateTicketInput): Ticket {
  const now = new Date().toISOString();
  const tickets = readTickets();
  const environment = mergeEnvironment(detectEnvironment(), input.environment);
  const newTicket: Ticket = {
    id: generateId(),
    title: input.title,
    category: input.category,
    priority: input.priority,
    status: "Open",
    channel: input.channel,
    description: input.description,
    stepsToReproduce: input.stepsToReproduce,
    expectedResult: input.expectedResult,
    actualResult: input.actualResult,
    environment,
    createdAt: now,
    updatedAt: now,
  };

  tickets.unshift(newTicket);
  writeTickets(tickets);
  return newTicket;
}

export function updateTicket(id: string, patch: Partial<Ticket>): Ticket | null {
  const tickets = readTickets();
  const index = tickets.findIndex((ticket) => ticket.id === id);
  if (index === -1) {
    return null;
  }

  const current = tickets[index];
  const updated: Ticket = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  tickets[index] = updated;
  writeTickets(tickets);
  return updated;
}

export function deleteTicket(id: string): boolean {
  const tickets = readTickets();
  const nextTickets = tickets.filter((ticket) => ticket.id !== id);

  if (nextTickets.length === tickets.length) {
    return false;
  }

  writeTickets(nextTickets);
  return true;
}

export function clearTickets(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(STORAGE_KEY);
}
