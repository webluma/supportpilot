import OpenAI from "openai";
import { NextResponse } from "next/server";

import type { Ticket } from "@/lib/tickets/types";

type TicketAnalysisResult = {
  customerReply: string;
  qaSummary: string;
  followUpQuestions: string[];
};

type TicketAnalysisRequest = {
  ticket?: Ticket;
};

function extractOutputText(responseBody: unknown): string | null {
  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "output_text" in responseBody &&
    typeof (responseBody as { output_text?: unknown }).output_text === "string"
  ) {
    const outputText = (responseBody as { output_text: string }).output_text;
    return outputText.trim() ? outputText : null;
  }

  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "output" in responseBody &&
    Array.isArray((responseBody as { output?: unknown }).output)
  ) {
    const output = (responseBody as { output: Array<{ content?: unknown }> })
      .output;
    const chunks: string[] = [];
    output.forEach((item) => {
      if (!item?.content || !Array.isArray(item.content)) {
        return;
      }
      item.content.forEach((contentItem: { type?: string; text?: string }) => {
        if (contentItem.type === "output_text" && contentItem.text) {
          chunks.push(contentItem.text);
        }
      });
    });
    const joined = chunks.join("").trim();
    return joined ? joined : null;
  }

  return null;
}

function toSafeString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function POST(request: Request) {
  let payload: TicketAnalysisRequest | null = null;

  try {
    payload = (await request.json()) as TicketAnalysisRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const ticket = payload?.ticket;
  if (!ticket || !ticket.title || !ticket.description) {
    return NextResponse.json(
      { error: "Ticket title and description are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured." },
      { status: 500 },
    );
  }

  const client = new OpenAI({ apiKey });

  try {
    const systemPrompt = [
      "You are SupportPilot AI, an assistant that helps support teams draft responses and QA-ready summaries.",
      "Return output in JSON that matches the provided schema.",
      "Customer reply must be empathetic, concise, and ready to send to the customer.",
      "QA summary must be technical, structured, and include key details (summary, steps, expected vs actual, severity, tags).",
      "Follow-up questions must be short, actionable, and help unblock triage.",
      "Always respond in English.",
    ].join(" ");

    const userPrompt = [
      "Analyze the support ticket below and produce the required JSON output.",
      "Ticket JSON:",
      JSON.stringify(ticket),
    ].join("\n");

    const responseBody = await client.responses.create({
      model: "gpt-5-nano",
      instructions: systemPrompt,
      input: userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "ticket_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              customerReply: { type: "string" },
              qaSummary: { type: "string" },
              followUpQuestions: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["customerReply", "qaSummary", "followUpQuestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const outputText =
      typeof responseBody.output_text === "string"
        ? responseBody.output_text
        : extractOutputText(responseBody);
    if (!outputText) {
      console.error("OpenAI response missing output_text", {
        ticketId: ticket.id,
        responseBody: toSafeString(responseBody).slice(0, 2000),
      });
      return NextResponse.json(
        { error: "Empty AI response." },
        { status: 500 },
      );
    }

    let parsed: TicketAnalysisResult | null = null;
    try {
      parsed = JSON.parse(outputText) as TicketAnalysisResult;
    } catch {
      console.error("Failed to parse AI response JSON", {
        ticketId: ticket.id,
        outputText: outputText.slice(0, 2000),
      });
      return NextResponse.json(
        { error: "Failed to parse AI response." },
        { status: 500 },
      );
    }

    if (
      !parsed ||
      typeof parsed.customerReply !== "string" ||
      typeof parsed.qaSummary !== "string" ||
      !Array.isArray(parsed.followUpQuestions)
    ) {
      console.error("Invalid AI response shape", {
        ticketId: ticket.id,
        parsed: toSafeString(parsed).slice(0, 2000),
      });
      return NextResponse.json(
        { error: "Invalid AI response shape." },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const upstreamStatus = error.status ?? 500;
      const status = upstreamStatus >= 500 ? 502 : upstreamStatus;
      const errorPayload = (error as OpenAI.APIError & { error?: unknown })
        .error;
      const openAiMessage =
        (errorPayload as { message?: string })?.message ?? error.message;
      const openAiType =
        (errorPayload as { type?: string })?.type ?? error.type ?? null;
      const openAiCode =
        (errorPayload as { code?: string })?.code ?? error.code ?? null;
      const details = toSafeString(errorPayload ?? openAiMessage).slice(0, 2000);
      const friendlyMessage =
        upstreamStatus === 429
          ? "OpenAI quota/rate limit exceeded. Check OpenAI Platform billing/limits."
          : upstreamStatus === 401 || upstreamStatus === 403
            ? "OpenAI authentication failed."
            : "OpenAI request failed.";

      console.error("OpenAI request failed", {
        status,
        upstreamStatus,
        details,
        type: openAiType,
        code: openAiCode,
        ticketId: ticket.id,
      });

      return NextResponse.json(
        {
          error: friendlyMessage,
          details,
          openai: {
            message: openAiMessage ?? null,
            type: openAiType,
            code: openAiCode,
          },
          status,
          upstreamStatus,
        },
        { status },
      );
    }

    console.error("Unexpected error while generating AI output", {
      ticketId: ticket?.id,
    });
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
