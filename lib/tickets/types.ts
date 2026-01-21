export type TicketCategory =
  | "Bug"
  | "Performance"
  | "Billing"
  | "Login"
  | "UI"
  | "Feature Request"
  | "Other";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export type TicketStatus = "Open" | "In Progress" | "Resolved";

export type TicketChannel = "Web" | "Mobile" | "Desktop" | "Other";

export type TicketEnvironment = {
  browser?: string;
  os?: string;
  deviceType?: "Desktop" | "Mobile";
  userAgent?: string;
};

export type TicketAiOutput = {
  customerReply: string;
  qaSummary: string;
  followUpQuestions: string[];
  generatedAt: string;
  model: string;
};

export type Ticket = {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  description: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  environment: TicketEnvironment;
  createdAt: string;
  updatedAt: string;
  aiOutput?: TicketAiOutput;
};

export type CreateTicketInput = {
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  channel: TicketChannel;
  description: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: TicketEnvironment;
};
