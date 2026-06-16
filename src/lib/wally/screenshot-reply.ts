export const WALLY_SCREENSHOT_REPLY = `Here is the operational view for the current workspace.

The highest follow-up risk is the two open call logs: one flying fox pup at Woonona and one brushtail possum in Corrimal. Both have caller details, suburb, and assigned carers, so the next step is to close the loop from Call Logs or send a Pindrop request if the exact rescue location is still unclear.

For reporting, you can use Custom Reporting with:

count from incidents where resolved = false group by severity chart bar

That will produce a role-scoped chart for unresolved incidents without exposing notes, addresses, or raw IDs. If you want this on the dashboard, save the query and switch on "Show on dashboard".

Before NSW annual reporting, check three things: animals missing required rescue fields, release checklist completion, and carer licence or training expiry. The dashboard already has widgets for these so coordinators can fix gaps before exporting the detailed report.`;

export function streamScreenshotWords(text = WALLY_SCREENSHOT_REPLY, delayMs = 25) {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      controller.close();
    },
  });
}
