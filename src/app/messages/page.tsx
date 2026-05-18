import type { Metadata } from "next";

import { MessagesCentre } from "@/components/messages/messages-centre";

export const metadata: Metadata = {
  title: "Messages",
  description: "Travel Xchange member messages.",
};

export default function MessagesPage() {
  return <MessagesCentre />;
}
