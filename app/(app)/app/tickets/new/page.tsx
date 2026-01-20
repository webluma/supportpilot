"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  CreateTicketInput,
  TicketCategory,
  TicketChannel,
  TicketPriority,
} from "@/lib/tickets/types";
import { useTicketsStore } from "@/store/useTicketsStore";

const categoryOptions: TicketCategory[] = [
  "Bug",
  "Performance",
  "Billing",
  "Login",
  "UI",
  "Feature Request",
  "Other",
];

const priorityOptions: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

const channelOptions: TicketChannel[] = ["Web", "Mobile", "Desktop", "Other"];

const inputStyles =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white";

type FormErrors = {
  title?: string;
  category?: string;
  priority?: string;
  channel?: string;
  description?: string;
};

export default function NewTicketPage() {
  const router = useRouter();
  const createTicket = useTicketsStore((state) => state.createTicket);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [channel, setChannel] = useState<TicketChannel | "">("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors: FormErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      nextErrors.title = "Title is required.";
    }
    if (!category) {
      nextErrors.category = "Category is required.";
    }
    if (!priority) {
      nextErrors.priority = "Priority is required.";
    }
    if (!channel) {
      nextErrors.channel = "Channel is required.";
    }
    if (!trimmedDescription) {
      nextErrors.description = "Description is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload: CreateTicketInput = {
      title: trimmedTitle,
      category,
      priority,
      channel,
      description: trimmedDescription,
    };

    const trimmedSteps = stepsToReproduce.trim();
    if (trimmedSteps) {
      payload.stepsToReproduce = trimmedSteps;
    }

    const trimmedExpected = expectedResult.trim();
    if (trimmedExpected) {
      payload.expectedResult = trimmedExpected;
    }

    const trimmedActual = actualResult.trim();
    if (trimmedActual) {
      payload.actualResult = trimmedActual;
    }

    setIsSubmitting(true);
    const ticket = createTicket(payload);
    router.push(`/app/tickets/${ticket.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Ticket"
        description="Capture the issue context so AI can generate an empathetic response and a structured QA report."
        badge={<Badge variant="warning">Draft</Badge>}
      />
      <Card className="p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className={inputStyles}
                placeholder="Short summary of the issue"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              {errors.title ? (
                <p className="text-xs text-rose-600">{errors.title}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className={inputStyles}
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as TicketCategory)
                  }
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <p className="text-xs text-rose-600">{errors.category}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="priority">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  className={inputStyles}
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TicketPriority)
                  }
                >
                  <option value="">Select priority</option>
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.priority ? (
                  <p className="text-xs text-rose-600">{errors.priority}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900" htmlFor="channel">
                  Channel
                </label>
                <select
                  id="channel"
                  name="channel"
                  className={inputStyles}
                  value={channel}
                  onChange={(event) =>
                    setChannel(event.target.value as TicketChannel)
                  }
                >
                  <option value="">Select channel</option>
                  {channelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.channel ? (
                  <p className="text-xs text-rose-600">{errors.channel}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className={`${inputStyles} min-h-[120px]`}
                placeholder="Describe the issue in detail"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {errors.description ? (
                <p className="text-xs text-rose-600">{errors.description}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="stepsToReproduce"
              >
                Steps to reproduce (optional)
              </label>
              <textarea
                id="stepsToReproduce"
                name="stepsToReproduce"
                className={`${inputStyles} min-h-[96px]`}
                placeholder="List the steps to reproduce the issue"
                value={stepsToReproduce}
                onChange={(event) => setStepsToReproduce(event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-900"
                  htmlFor="expectedResult"
                >
                  Expected result (optional)
                </label>
                <textarea
                  id="expectedResult"
                  name="expectedResult"
                  className={`${inputStyles} min-h-[96px]`}
                  placeholder="What should happen instead?"
                  value={expectedResult}
                  onChange={(event) => setExpectedResult(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-900"
                  htmlFor="actualResult"
                >
                  Actual result (optional)
                </label>
                <textarea
                  id="actualResult"
                  name="actualResult"
                  className={`${inputStyles} min-h-[96px]`}
                  placeholder="What actually happens?"
                  value={actualResult}
                  onChange={(event) => setActualResult(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create ticket"}
            </Button>
            <ButtonLink href="/app/tickets" variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
