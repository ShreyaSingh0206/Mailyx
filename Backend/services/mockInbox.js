// Incoming-email templates for the simulated "sync" (raw emails, no AI fields).
// Placeholders: {{client}} = client's first name, {{sender}} = sender's full name
export const MOCK_INBOX = [
  { sender: ["Karthik Rao", "karthik@brightfin.example"], subject: "Budget sign-off for Q1 marketing spend",
    body: "Hi {{client}},\n\nWe need your sign-off on the Q1 marketing budget (INR 12L) before Thursday so campaigns can start on schedule. The breakdown is attached.\n\nThanks,\n{{sender}}" },
  { sender: ["Nisha Arora", "nisha@boardoffice.example"], subject: "Availability next week for board prep call?",
    body: "Hello {{client}},\n\nCould you share a few slots next week for a 45-minute board prep call? Tuesday or Wednesday afternoon would be ideal.\n\n{{sender}}" },
  { sender: ["Analytics Digest", "digest@insightly.example"], subject: "Your weekly analytics report is ready",
    body: "Your weekly report is ready: sessions up 4.2%, conversions steady. View the full dashboard online. You are receiving this because you subscribed to weekly digests." },
  { sender: ["Rohit Sethi", "rohit@opsdesk.example"], subject: "Reminder: expense report due Friday",
    body: "Hi {{client}},\n\nA reminder that last month's expense report is due this Friday. Please send the receipts or let me know who will submit them.\n\n{{sender}}\nOps Desk" },
  { sender: ["Maya Iyer", "maya@techdaily.example"], subject: "Interview request: feature on founders to watch",
    body: "Dear {{client}},\n\nI'm a reporter at TechDaily working on a feature about founders to watch in 2027. Would you be open to a 30-minute interview in the next two weeks?\n\n{{sender}}" },
  { sender: ["Billing", "billing@notesapp.example"], subject: "Your subscription has renewed",
    body: "Thanks! Your annual subscription renewed today for $96.00. Your invoice is attached. No action is required." },
  { sender: ["Vikram Nair", "vikram@eventsco.example"], subject: "Venue options for the offsite",
    body: "Hi {{client}},\n\nWe've shortlisted two venues for the March offsite: a lakeside resort (60 guests) and a city hotel (80 guests). Can you let us know which direction to take? Both are available on the 14th.\n\n{{sender}}" },
  { sender: ["Ananya Das", "ananya@designhub.example"], subject: "Following up: did you see my last email?",
    body: "Hi {{client}},\n\nJust following up on my earlier note about the brand refresh timeline. Could someone confirm a call time this week?\n\n{{sender}}" },
  { sender: ["Rajesh Gupta", "rajesh@oldfriend.example"], subject: "Congratulations on the funding round!",
    body: "Hey {{client}}!\n\nSaw the news about your funding round, massive congratulations. Let's catch up over dinner when you're next in town.\n\nRajesh" },
  { sender: ["Shared Docs", "no-reply@docshare.example"], subject: "Document shared with you: Q4 forecast.xlsx",
    body: "Finance Team shared a document with you: Q4 forecast.xlsx. Open it from your drive. This is an automated message." },
];