/**
 * MailMate AI seed script
 *
 *   npm run seed                      -> 3 demo clients + ~80 emails, AI fields pre-filled
 *   npm run seed -- --pending         -> emails only, AI fields empty (let the real AI pipeline fill them)
 *   npm run seed -- --dry             -> build + validate data, print stats, touch NOTHING in the DB
 *   npm run seed -- --clean           -> remove the demo clients and their emails
 *   npm run seed -- --assistant=you@example.com   -> seed under a specific assistant account
 *
 * The data is deterministic (seeded random), so every run gives the same dataset.
 * Only the demo clients below are ever touched; your real accounts are left alone.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";

import User from "../Models/User.js";
import Email from "../Models/Email.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

// PowerShell (Windows) swallows the "--" in `npm run seed -- --pending`, so npm sees
// --pending as ITS OWN flag and exposes it as the env var npm_config_pending instead of
// passing it to this script. Read those too, so the flags work everywhere.
for (const flag of ["pending", "dry", "clean"]) {
  const v = process.env[`npm_config_${flag}`];
  if (!args[flag] && (v === "true" || v === "")) args[flag] = true;
}
for (const opt of ["assistant", "seed"]) {
  const v = process.env[`npm_config_${opt}`];
  if (!args[opt] && v && v !== "true") args[opt] = v;
}

const DAY = 864e5;
const HOUR = 36e5;
const PASSWORD = process.env.SEED_CLIENT_PASSWORD || "Demo@1234";

// ---------------------------------------------------------------------------
// Demo clients (these can log in: password = Demo@1234)
// ---------------------------------------------------------------------------
const CLIENTS = [
  { name: "Aarav Mehta", email: "aarav@mehtacapital.test", company: "Mehta Capital", provider: "gmail" },
  { name: "Sofia Rossi", email: "sofia@rossidesign.test", company: "Rossi Design", provider: "outlook" },
  { name: "Daniel Kim", email: "daniel@kimlabs.test", company: "Kim Labs", provider: "gmail" },
];

// ---------------------------------------------------------------------------
// Email templates
//   expected : the classification a good AI should choose (ground truth)
//   actions  : [text, dueInDaysAfterReceived]
//   tricky   : ambiguous on purpose, good for testing the AI
// Placeholders: {{client}} {{clientFull}} {{company}} {{sender}} {{senderFirst}} {{assistant}}
// ---------------------------------------------------------------------------
const TEMPLATES = [
  // ===== CLIENT TO REPLY ====================================================
  {
    id: "proposal-approval", expected: "client_reply", labels: ["important"],
    senders: [["Priya Nair", "priya@northwind.example"]],
    subject: `Q1 campaign proposal - approval needed by tomorrow`,
    body: `Hi {{client}},\n\nPlease review the attached proposal and confirm your approval by tomorrow. We need a go/no-go to lock in the media slots at the quoted rate.\n\nThanks,\n{{sender}}\nNorthwind Studio`,
    summary: `Northwind Studio needs {{client}}'s go/no-go on the Q1 campaign proposal by tomorrow to hold the quoted media rates.`,
    why: `Approving a proposal is the client's decision and there is a deadline.`,
    actions: [[`Review the attached Q1 campaign proposal`, 1], [`Confirm approval (go/no-go) to Northwind`, 1]],
    draft: `Hi {{senderFirst}},\n\nThanks for sending the proposal over. I've reviewed it and [approve it as is / would like to discuss changes to ...].\n\nPlease [go ahead and lock in the media slots / hold off until we speak].\n\nBest,\n{{clientFull}}`,
  },
  {
    id: "contract-signature", expected: "client_reply", labels: ["important"],
    senders: [["Meera Shah", "meera@legalpartners.example"]],
    subject: `URGENT: vendor agreement needs your signature by EOD`,
    body: `Dear {{client}},\n\nThe vendor agreement must be signed today or the deal window closes. I've attached the final version. Please review clause 7 and send back the signed copy.\n\nMeera Shah\nLegal Partners LLP`,
    summary: `Legal Partners needs {{client}} to review clause 7 and return the signed vendor agreement today.`,
    why: `A signature is a personal legal commitment that only the client can give.`,
    actions: [[`Review clause 7 of the vendor agreement`, 0], [`Sign and return the vendor agreement`, 0]],
    draft: `Hi Meera,\n\nI've reviewed the agreement. [Clause 7 is fine / I'd like clause 7 changed to ...]. I will send the signed copy by [time] today.\n\nBest,\n{{clientFull}}`,
  },
  {
    id: "invoice-approval", expected: "client_reply", labels: ["important"],
    senders: [["Finance Desk", "finance@brightwave.example"]],
    subject: `Invoice #4821 for $18,500 awaiting your approval`,
    body: `Hello {{client}},\n\nInvoice #4821 from Brightwave Media for $18,500 is ready for approval. Payment is due on the 20th; late payments incur a 2% fee.\n\nRegards,\nBrightwave Finance`,
    summary: `Brightwave Media's $18,500 invoice (#4821) needs {{client}}'s approval before the 20th to avoid a 2% late fee.`,
    why: `Approving a large payment is a financial commitment for the client.`,
    actions: [[`Approve or query invoice #4821 ($18,500)`, 4]],
    draft: `Hi team,\n\nThanks for the invoice. [I approve payment of invoice #4821 / I have a question about ...].\n\nBest,\n{{clientFull}}`,
  },
  {
    id: "investor-intro", expected: "client_reply", labels: ["meeting"],
    senders: [["Neha Kapoor", "neha@lakeviewvc.example"]],
    subject: `Intro: Lakeview Ventures would like a 20-min call`,
    body: `Hi {{client}},\n\nA partner at Lakeview Ventures asked me to connect you two. Would you be open to a 20-minute intro call next week? Happy to make the introduction if so.\n\nNeha`,
    summary: `Neha offers an introduction to a Lakeview Ventures partner for a 20-minute call next week.`,
    why: `Whether to take an investor intro is a personal decision for the client.`,
    actions: [[`Decide whether to accept the Lakeview Ventures intro`, 5]],
    draft: `Hi Neha,\n\nThanks for thinking of me. I'd be glad to [take the call / pass for now because ...]. Please introduce us by email and my assistant will find a time.\n\nBest,\n{{clientFull}}`,
  },
  {
    id: "offer-signoff", expected: "client_reply", labels: ["important"],
    senders: [["Karan Joshi", "karan@peopleops.example"]],
    subject: `Offer for Senior Designer - need your sign-off`,
    body: `Hi {{client}},\n\nWe've shortlisted a Senior Designer and the proposed package is ready. Can you sign off on the offer so we can send it out by Wednesday?\n\nKaran\nPeople Ops`,
    summary: `People Ops wants {{client}}'s sign-off on the Senior Designer offer so it can go out by Wednesday.`,
    why: `Hiring sign-off is a decision for the client.`,
    actions: [[`Sign off on the Senior Designer offer`, 2]],
    draft: `Hi Karan,\n\n[Approved - please send the offer / Let's discuss the package first].\n\nBest,\n{{clientFull}}`,
  },
  {
    id: "keynote-invite", expected: "client_reply", labels: ["important"],
    senders: [["Elena Petrova", "elena@futurestack.example"]],
    subject: `Invitation: keynote at FutureStack Summit (March 12)`,
    body: `Dear {{client}},\n\nWe'd be honoured to have you deliver a 30-minute keynote at FutureStack Summit on March 12 in Bengaluru. Could you let us know by next week whether you can join?\n\nElena Petrova\nFutureStack`,
    summary: `FutureStack invites {{client}} to give a 30-minute keynote on March 12 and asks for an answer within a week.`,
    why: `Accepting a speaking engagement is a personal decision.`,
    actions: [[`Decide on the FutureStack keynote invitation`, 7]],
    draft: `Dear Elena,\n\nThank you for the invitation. [I'd be delighted to speak / Unfortunately I can't make it this time].\n\nBest,\n{{clientFull}}`,
  },
  {
    id: "family-dinner", expected: "client_reply", labels: [],
    senders: [["Anita (Mom)", "anita.family@example.com"]],
    subject: `Dinner on Sunday?`,
    body: `Beta, are you free for dinner on Sunday? Your aunt is visiting. Let me know by Friday so I can plan.\n\nMom`,
    summary: `{{client}}'s mother asks if they can join family dinner on Sunday and wants an answer by Friday.`,
    why: `Personal family matter.`,
    actions: [[`Reply about Sunday dinner`, 4]],
    draft: `Hi Mom,\n\nI'd love to, [yes I'll be there / sorry, I can't this Sunday].\n\nLove,\n{{client}}`,
    scenario: "takeover", note: `I'm travelling that day - can you let her know I can't make it?`,
  },
  {
    id: "partnership-terms", expected: "client_reply", labels: ["important", "follow_up"],
    senders: [["Tom Becker", "tom@acmeco.example"]],
    subject: `Final call on revenue share terms`,
    body: `Hi {{client}},\n\nWe've gone back and forth enough, so here is our final offer: 70/30 revenue share for the first year, then 60/40. Let me know if you're in.\n\nTom Becker\nAcme Co.`,
    summary: `Acme Co. sends a final revenue-share offer (70/30 in year one, then 60/40) and wants {{client}}'s decision.`,
    why: `Commercial terms must be accepted by the client personally.`,
    actions: [[`Accept, counter or decline Acme's revenue share offer`, 3]],
    draft: `Hi Tom,\n\nThanks for the clear offer. [We accept the terms / I'd like to propose ...].\n\nBest,\n{{clientFull}}`,
    followUp: { hours: 28, body: `Hi {{client}},\n\nGentle nudge on the revenue share terms. We'd like to close this week if possible.\n\nTom`, summary: `Tom from Acme Co. is following up and wants to close the revenue share deal this week.` },
  },
  {
    id: "pricing-flex", expected: "client_reply", labels: ["follow_up"], tricky: true,
    senders: [["Lara Singh", "lara@orbitlabs.example"]],
    subject: `Quick question about pricing for 50 seats`,
    body: `Hi {{client}},\n\nWe're evaluating your product for our team of 50. Is there any flexibility on the per-seat price? Happy to jump on a call.\n\nLara\nOrbit Labs`,
    summary: `Orbit Labs asks whether {{client}} can offer a discount on per-seat pricing for a 50-seat deployment.`,
    why: `Pricing flexibility is a commercial decision, though the assistant could gather details first.`,
    actions: [[`Decide on pricing flexibility for Orbit Labs (50 seats)`, 3]],
    draft: `Hi Lara,\n\nThanks for your interest. For 50 seats we can [offer ...% off / hold the standard price]. Happy to set up a call.\n\nBest,\n{{clientFull}}`,
  },

  // ===== ASSISTANT TO REPLY =================================================
  {
    id: "reschedule-sync", expected: "assistant_reply", labels: ["meeting"],
    senders: [["Priya Nair", "priya@northwind.example"], ["Tom Becker", "tom@acmeco.example"]],
    subject: `Can we move Thursday's sync to 3pm?`,
    body: `Hi {{client}},\n\nSomething came up on our side. Could we move Thursday's sync to 3pm IST instead? If that doesn't work, Friday morning is also open.\n\nThanks,\n{{sender}}`,
    summary: `{{sender}} asks to move Thursday's sync to 3pm IST, with Friday morning as the alternative.`,
    why: `Routine rescheduling the assistant can handle from the calendar.`,
    actions: [[`Check {{client}}'s calendar for Thursday 3pm IST`, 1], [`Confirm the new time or propose Friday morning`, 1]],
    draft: `Hi {{senderFirst}},\n\nThanks for the heads-up. I'm checking {{client}}'s calendar and will confirm Thursday 3pm IST shortly; if it doesn't work I'll suggest Friday morning.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
  },
  {
    id: "deck-request", expected: "assistant_reply", labels: [],
    senders: [["Sam Ortiz", "sam@harborpartners.example"]],
    subject: `Could you send over the latest pitch deck?`,
    body: `Hi {{client}},\n\nCould you send over the latest version of your pitch deck? Our team would like to review it before Friday.\n\nThanks,\nSam Ortiz\nHarbor Partners`,
    summary: `Harbor Partners asks for the latest pitch deck before Friday.`,
    why: `Sharing an existing document is a routine task for the assistant.`,
    actions: [[`Send the latest pitch deck to Sam at Harbor Partners`, 2]],
    draft: `Hi Sam,\n\nPlease find the latest pitch deck attached. Let us know if you need anything else.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
  },
  {
    id: "traveller-details", expected: "assistant_reply", labels: ["follow_up"],
    senders: [["Divya Menon", "divya@traveldesk.example"]],
    subject: `Traveller details needed to complete Mumbai booking`,
    body: `Hello {{client}},\n\nTo finish your Mumbai booking we need the traveller's full name as on ID and a contact number. Please reply by tomorrow so the fare isn't lost.\n\nDivya\nTravelDesk`,
    summary: `TravelDesk needs the traveller's ID name and a contact number by tomorrow to complete the Mumbai booking.`,
    why: `Logistics details the assistant already has on file.`,
    actions: [[`Send traveller name and contact number to TravelDesk`, 1]],
    draft: `Hi Divya,\n\nHere are the details: Name: [name as on ID], Phone: [number]. Please confirm once the booking is complete.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
  },
  {
    id: "support-login", expected: "assistant_reply", labels: ["important"],
    senders: [["Rahul Verma", "rahul@customer.example"]],
    subject: `Still facing login issue on mobile`,
    body: `Hi {{client}},\n\nI tried resetting my password twice but the mobile app still shows "invalid session". Can someone look into this? It's blocking my team.\n\nRahul`,
    summary: `Customer Rahul can't log in on mobile even after two password resets and says it is blocking his team.`,
    why: `A customer support issue the assistant can route to the support team.`,
    actions: [[`Forward the login issue to the support team`, 1], [`Reply to Rahul with an update`, 1]],
    draft: `Hi Rahul,\n\nSorry about the trouble. I've passed this to our support team and they will contact you today. Could you share your device model and app version?\n\nBest regards,\n{{assistant}}\nOn behalf of {{clientFull}}`,
    followUp: { hours: 40, body: `Hi {{client}},\n\nIt's been two days and we're still blocked. Any update?\n\nRahul`, summary: `Rahul is following up two days later; his team is still blocked by the mobile login issue.` },
  },
  {
    id: "workshop-invite", expected: "assistant_reply", labels: ["meeting"],
    senders: [["Calendar Team", "calendar@planningoffice.example"]],
    subject: `Invitation: Q4 planning workshop - Dec 3, 10:00 IST`,
    body: `Hi {{client}},\n\nYou're invited to the Q4 planning workshop on Dec 3 at 10:00 IST (3 hours). Please accept or decline so we can finalise seating.\n\nPlanning Office`,
    summary: `Invitation to the Q4 planning workshop on Dec 3 at 10:00 IST; the organisers want an accept or decline.`,
    why: `Accepting or declining invites is calendar management for the assistant.`,
    actions: [[`Check the calendar and accept or decline the Dec 3 workshop`, 3]],
    draft: `Hello,\n\nThank you for the invitation. {{client}} [will attend / is unable to attend] the workshop on Dec 3.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
  },
  {
    id: "catering-quote", expected: "assistant_reply", labels: ["follow_up"],
    senders: [["Marco Bellini", "marco@bellinicatering.example"]],
    subject: `Updated catering quote attached`,
    body: `Hi {{client}},\n\nAttached is the updated quote for the offsite (40 guests). Please confirm the headcount by Monday so we can hold the date.\n\nMarco\nBellini Catering`,
    summary: `Bellini Catering sent an updated quote for 40 guests and needs the headcount confirmed by Monday.`,
    why: `Confirming a headcount is an operational task for the assistant.`,
    actions: [[`Confirm headcount of 40 with Bellini Catering`, 4]],
    draft: `Hi Marco,\n\nThanks for the updated quote. We confirm a headcount of [40]. Please hold the date.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
    scenario: "corrected", aiSaid: "no_reply", aiWhy: `Looks like an informational attachment with no direct question.`,
  },
  {
    id: "nda-copy", expected: "assistant_reply", labels: [],
    senders: [["Meera Shah", "meera@legalpartners.example"]],
    subject: `Please send the signed NDA copy for our records`,
    body: `Dear {{client}},\n\nCould you send us a copy of the signed NDA for our records? A scanned PDF is fine.\n\nMeera Shah`,
    summary: `Legal Partners asks for a scanned copy of the already-signed NDA.`,
    why: `Sending an existing signed document is routine for the assistant.`,
    actions: [[`Send the signed NDA PDF to Meera`, 2]],
    draft: `Dear Meera,\n\nPlease find the signed NDA attached.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
  },
  {
    id: "interview-slots", expected: "assistant_reply", labels: ["meeting"],
    senders: [["Isha Rao", "isha@talentbridge.example"]],
    subject: `Interview slots for Friday`,
    body: `Hi {{client}},\n\nThe candidate is available Friday at 11:00, 14:00 or 16:30. Which slot works best for you?\n\nIsha Rao\nTalentBridge`,
    summary: `TalentBridge offers three Friday interview slots (11:00, 14:00, 16:30) and wants one picked.`,
    why: `Picking a slot from the calendar is scheduling work for the assistant.`,
    actions: [[`Pick a Friday interview slot and reply to Isha`, 2]],
    draft: `Hi Isha,\n\nFriday at [time] works for {{client}}. Please send the invite.\n\nBest regards,\n{{assistant}}\nAssistant to {{clientFull}}`,
    followUp: { hours: 30, body: `Hi {{client}},\n\nFollowing up - the candidate is waiting to hear about Friday's slot.\n\nIsha`, summary: `Isha is following up; the candidate is still waiting for a confirmed Friday interview slot.` },
  },

  // ===== NO REPLY NEEDED ====================================================
  {
    id: "newsletter", expected: "no_reply", labels: [],
    senders: [["Product Weekly", "hello@productweekly.example"]],
    subject: `This week in product: 7 trends you can't ignore`,
    body: `Welcome to this week's issue. Top stories: AI copilots in B2B, pricing experiments, and a teardown of a viral onboarding flow. Unsubscribe any time.`,
    summary: `Weekly product newsletter covering AI copilots, pricing experiments and an onboarding teardown.`,
    why: `Newsletter, no response expected.`, actions: [],
  },
  {
    id: "flight-confirmation", expected: "no_reply", labels: [],
    senders: [["AirBharat", "noreply@airbharat.example"]],
    subject: `Booking confirmed: DEL to BOM, Monday 09:15`,
    body: `Your flight AB-204 departs Monday at 09:15 from Delhi (T1) and arrives at 11:25 in Mumbai. Web check-in opens 48 hours before departure.`,
    summary: `Flight AB-204 from Delhi to Mumbai is confirmed for Monday 09:15.`,
    why: `Automated booking confirmation.`, actions: [],
  },
  {
    id: "payment-receipt", expected: "no_reply", labels: [],
    senders: [["CloudHost Billing", "billing@cloudhost.example"]],
    subject: `Payment received - receipt #4799`,
    body: `Thank you! We've received your payment of $2,340.00. Your receipt is attached. No further action is required.`,
    summary: `CloudHost confirms receipt of a $2,340 payment; no action needed.`,
    why: `Automated receipt.`, actions: [],
  },
  {
    id: "security-alert", expected: "no_reply", labels: [],
    senders: [["Account Security", "security@accounts.example"]],
    subject: `New sign-in to your account`,
    body: `We noticed a new sign-in from a Chrome browser on Windows. If this was you, no action is needed.`,
    summary: `Automated notice about a new sign-in; no action needed unless it was not the client.`,
    why: `Automated security notification.`, actions: [],
  },
  {
    id: "calendar-accept", expected: "no_reply", labels: ["meeting"],
    senders: [["Aisha Khan", "aisha@partner.example"]],
    subject: `Accepted: Design review (Wed 11:00)`,
    body: `Aisha Khan has accepted your invitation to "Design review" on Wednesday at 11:00.`,
    summary: `Aisha Khan accepted the Wednesday 11:00 design review invitation.`,
    why: `Calendar acceptance, nothing to answer.`, actions: [],
  },
  {
    id: "visa-status", expected: "no_reply", labels: ["waiting"],
    senders: [["Consulate Portal", "status@consulateportal.example"]],
    subject: `Update: your application is being processed`,
    body: `Your application is currently under review. Processing usually takes 5-7 working days. You do not need to take any action.`,
    summary: `Application is under review (5-7 working days); nothing to do but wait.`,
    why: `Status update; the matter is waiting on a third party.`, actions: [],
  },
  {
    id: "fyi-unless-object", expected: "no_reply", labels: ["waiting"], tricky: true,
    senders: [["Priya Nair", "priya@northwind.example"]],
    subject: `FYI: going ahead with the revised timeline`,
    body: `Hi {{client}},\n\nJust a heads-up that we're going ahead with the revised timeline (launch moves from the 12th to the 19th). No need to reply unless you object.\n\nPriya`,
    summary: `Northwind is moving launch from the 12th to the 19th and only needs a reply if {{client}} objects.`,
    why: `Informational; reply needed only on objection, so monitor rather than respond.`, actions: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Small deterministic PRNG so every run produces the same dataset
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const makeFill = (ctx) => (s = "") =>
  s
    .replaceAll("{{clientFull}}", ctx.full)
    .replaceAll("{{client}}", ctx.first)
    .replaceAll("{{company}}", ctx.company)
    .replaceAll("{{senderFirst}}", ctx.sender.split(" ")[0])
    .replaceAll("{{sender}}", ctx.sender)
    .replaceAll("{{assistant}}", ctx.assistant);

const HANDLED_NOTES = [`Approved, go ahead.`, `Handled this myself on a call.`, `Done, thanks.`];

/** Build the email document(s) for one template + one client. */
function buildEmails({ t, client, assistant, ci, rng, now, pending }) {
  const [senderName, senderEmail] = pick(rng, t.senders);
  const fill = makeFill({
    first: client.name.split(" ")[0],
    full: client.name,
    company: client.company,
    sender: senderName,
    assistant: assistant.name,
  });

  const received = new Date(now - (0.2 + rng() * 6.3) * DAY);
  const threadId = `thr_${client._id}_${t.id}`;
  const subject = fill(t.subject);

  const common = {
    assistant: assistant._id,
    client: client._id,
    threadId,
    from: { name: senderName, email: senderEmail },
    to: [{ name: client.name, email: client.email }],
    subject,
    body: fill(t.body),
    receivedAt: received,
    seedExpected: t.expected,
  };

  const makeAI = (summary, at) => ({
    aiStatus: "done",
    aiProvider: "seed",
    aiProcessedAt: new Date(at.getTime() + 60e3),
    classification: t.expected,
    aiClassification: t.expected,
    classificationSource: "ai",
    aiReasoning: fill(t.why),
    labels: [...t.labels],
    summary: fill(summary),
    actionItems: t.actions.map(([text, d]) => ({
      text: fill(text),
      dueDate: new Date(at.getTime() + d * DAY),
      done: false,
    })),
    ...(t.draft && t.expected !== "no_reply"
      ? { draft: { subject: `Re: ${subject}`, body: fill(t.draft), source: "ai", updatedAt: at } }
      : {}),
  });

  // ---- pending mode: raw emails only, the real AI pipeline will fill the rest
  if (pending) {
    const docs = [{ ...common, aiStatus: "pending", isRead: rng() < 0.3 }];
    if (t.followUp) docs.push(followUpDoc(t, common, fill, received, now, { aiStatus: "pending", isRead: false }));
    return docs;
  }

  // ---- pre-filled mode
  const main = { ...common, ...makeAI(t.summary, received), status: "open" };
  const applies = ci === 0 || rng() < 0.4; // first client always shows each special scenario

  if (t.scenario === "takeover" && applies) {
    // client asked the assistant to take over -> moves to assistant queue
    main.classification = "assistant_reply";
    main.classificationSource = "client";
    main.takeoverRequested = true;
    main.isRead = false;
    main.notes = [{ author: client._id, role: "client", text: fill(t.note), createdAt: new Date(received.getTime() + 2 * HOUR) }];
  } else if (t.scenario === "corrected" && applies) {
    // AI got it wrong, assistant corrected it
    main.aiClassification = t.aiSaid;
    main.aiReasoning = t.aiWhy;
    main.classification = t.expected;
    main.classificationSource = "assistant";
    main.isRead = true;
  } else if (t.expected === "client_reply" && rng() < 0.25) {
    main.status = "handled";
    main.handledAt = new Date(received.getTime() + 4 * HOUR);
    main.handledByRole = "client";
    main.isRead = true;
    main.notes = [{ author: client._id, role: "client", text: pick(rng, HANDLED_NOTES), createdAt: main.handledAt }];
    main.actionItems.forEach((a) => (a.done = true));
  } else if (t.expected === "assistant_reply" && rng() < 0.25) {
    main.status = "replied";
    main.repliedByRole = "assistant";
    main.repliedAt = new Date(received.getTime() + 5 * HOUR);
    main.handledAt = main.repliedAt;
    main.isRead = true;
    if (main.draft) main.draft.source = "assistant";
    main.actionItems.forEach((a) => (a.done = true));
  } else {
    main.isRead = rng() < (t.expected === "no_reply" ? 0.6 : 0.35);
  }

  const docs = [main];
  if (t.followUp) {
    docs.push(
      followUpDoc(t, common, fill, received, now, {
        ...makeAI(t.followUp.summary, new Date(received.getTime() + t.followUp.hours * HOUR)),
        labels: [...new Set([...t.labels, "follow_up"])],
        status: "open",
        isRead: false,
      })
    );
  }
  return docs;
}

function followUpDoc(t, common, fill, received, now, extra) {
  const at = new Date(Math.min(received.getTime() + t.followUp.hours * HOUR, now - HOUR));
  return {
    ...common,
    subject: `Re: ${common.subject}`,
    body: fill(t.followUp.body),
    receivedAt: at,
    ...extra,
  };
}

const tally = (docs, key) =>
  docs.reduce((o, d) => ((o[d[key] ?? "(none)"] = (o[d[key] ?? "(none)"] || 0) + 1), o), {});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const run = async () => {
  const pending = Boolean(args.pending);
  console.log(`Mode: ${args.clean ? "clean" : args.dry ? "dry run" : pending ? "PENDING (AI fields empty)" : "PRE-FILLED (AI fields filled in)"}`);
  const rng = mulberry32(Number(args.seed) || 20260101);
  const now = Date.now();

  // ---------------- dry run: no database at all ----------------
  if (args.dry) {
    const assistant = { _id: new mongoose.Types.ObjectId(), name: "Demo Assistant" };
    const clients = CLIENTS.map((c) => ({ ...c, _id: new mongoose.Types.ObjectId() }));
    const docs = [];
    clients.forEach((client, ci) =>
      TEMPLATES.forEach((t) => docs.push(...buildEmails({ t, client, assistant, ci, rng, now, pending })))
    );

    let invalid = 0;
    for (const d of docs) {
      const err = new Email(d).validateSync();
      if (err) {
        invalid++;
        if (invalid <= 3) console.error("Invalid doc:", d.subject, "\n ", err.message);
      }
    }
    console.log(`[dry run] ${docs.length} emails for ${clients.length} clients, ${invalid} failed schema validation`);
    console.log("by classification:", tally(docs, "classification"));
    console.log("by status:        ", tally(docs, "status"));
    console.log("with drafts:", docs.filter((d) => d.draft).length,
      "| takeover requests:", docs.filter((d) => d.takeoverRequested).length,
      "| assistant-corrected:", docs.filter((d) => d.classificationSource === "assistant").length);
    process.exit(invalid ? 1 : 0);
  }

  // ---------------- real run ----------------
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing - check Backend/.env");
  await mongoose.connect(process.env.MONGO_URI);

  const assistant = args.assistant && args.assistant !== true
    ? await User.findOne({ email: String(args.assistant).toLowerCase(), role: "assistant" })
    : await User.findOne({ role: "assistant" }).sort({ createdAt: 1 });
  if (!assistant) throw new Error("No assistant account found. Sign up as an assistant in the app first.");
  console.log(`Using assistant: ${assistant.name} <${assistant.email}>`);

  // ---- clean mode
  if (args.clean) {
    const demo = await User.find({ email: { $in: CLIENTS.map((c) => c.email) }, role: "client", managedBy: assistant._id });
    const ids = demo.map((u) => u._id);
    const e = await Email.deleteMany({ assistant: assistant._id, client: { $in: ids } });
    const u = await User.deleteMany({ _id: { $in: ids } });
    console.log(`Removed ${u.deletedCount} demo clients and ${e.deletedCount} emails`);
    return;
  }

  // ---- create or reuse demo client users
  const hash = await bcrypt.hash(PASSWORD, 12);
  const clients = [];
  for (const c of CLIENTS) {
    let user = await User.findOne({ email: c.email });
    if (user && (user.role !== "client" || (user.managedBy && !user.managedBy.equals(assistant._id)))) {
      throw new Error(`${c.email} already exists and belongs to someone else - refusing to touch it`);
    }
    const emailAccount = { provider: c.provider, address: c.email, connectedAt: new Date() };
    if (!user) {
      user = await User.create({ name: c.name, email: c.email, password: hash, role: "client", managedBy: assistant._id, emailAccount });
    } else {
      user.managedBy = assistant._id;
      user.emailAccount = emailAccount;
      await user.save();
    }
    clients.push({ ...c, _id: user._id });
  }

  // ---- replace previously seeded emails for these demo clients only
  await Email.deleteMany({ assistant: assistant._id, client: { $in: clients.map((c) => c._id) } });

  const docs = [];
  clients.forEach((client, ci) =>
    TEMPLATES.forEach((t) => docs.push(...buildEmails({ t, client, assistant, ci, rng, now, pending })))
  );
  await Email.insertMany(docs);

  console.log(`\nSeeded ${clients.length} clients and ${docs.length} emails (${pending ? "AI fields EMPTY - run the AI pipeline" : "AI fields pre-filled"})`);
  console.log("by classification:", tally(docs, "classification"));
  console.log("\nClient logins (password for all: " + PASSWORD + ")");
  clients.forEach((c) => console.log(`  ${c.name.padEnd(14)} ${c.email}`));
};

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });