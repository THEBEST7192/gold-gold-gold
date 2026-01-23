import { Inngest } from "inngest";
import { serve } from "inngest/next";
import { getAvailableBuses } from "../entur/route";

const inngest = new Inngest({ id: "gold-gold-gold" });

export const fetchEnturBuses = inngest.createFunction(
  { id: "fetch-entur-buses", concurrency: 4 },
  { event: "app/entur.fetch" },
  async ({ event, step }: any) => {
    const operator = event.data.operator as string | undefined;

    if (!operator) {
      throw new Error("Operator is required.");
    }

    const clientName = process.env.ENTUR_CLIENT_NAME;

    if (!clientName) {
      throw new Error("ENTUR_CLIENT_NAME is not configured.");
    }

    const availableBuses = await step.run("fetch-buses-from-entur", () =>
      getAvailableBuses(operator, clientName),
    );

    return {
      operator,
      availableBuses,
      updatedAt: new Date().toISOString(),
    };
  },
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fetchEnturBuses],
});
