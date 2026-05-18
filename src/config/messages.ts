export function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function initials(value: string | null | undefined) {
  return (value ?? "Travel Xchange")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function notificationTypeLabel(value: string) {
  const labels: Record<string, string> = {
    best_answer: "Best answer",
    event_registration: "Event registration",
    group_post: "Group post",
    job_application: "Job application",
    message: "Message",
    reply: "Reply",
    system: "System",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}
