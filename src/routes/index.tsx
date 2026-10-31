import { createFileRoute } from "@tanstack/react-router";
import EchoApp from "@/components/echo/echo-app";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ECHO — Emergency communication" },
      {
        name: "description",
        content:
          "One tap builds a structured emergency message with live location and sends it over WhatsApp to authorities and family. Does not replace emergency services.",
      },
      { property: "og:title", content: "ECHO — Emergency communication" },
      {
        property: "og:description",
        content:
          "One tap builds a structured emergency message with live location and sends it over WhatsApp to authorities and family. Does not replace emergency services.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Index() {
  return <EchoApp />;
}
