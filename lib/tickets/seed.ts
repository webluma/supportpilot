import type { CreateTicketInput } from "./types";

export function createSeedTicketInput(): CreateTicketInput {
  return {
    title: "Mobile checkout button not responding",
    category: "UI",
    priority: "High",
    channel: "Mobile",
    description:
      "When I tap the checkout button on my phone, nothing happens and the cart stays on the same screen. I tried twice and the issue persists.",
    stepsToReproduce:
      "1. Open the mobile app\n2. Add any product to the cart\n3. Tap the Checkout button on the cart screen",
    expectedResult: "The checkout flow opens and prompts for payment details.",
    actualResult: "The button shows a brief highlight but no navigation occurs.",
    environment: {
      browser: "Mobile Safari",
      os: "iOS 17.2",
      deviceType: "Mobile",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    },
  };
}
