export const smsTemplates = [
    { id: 1, name: "First Outsource Notice", text: "Dear {Name}, your debt has been outsourced to us by {Client Name}. Contact us ASAP to arrange settlement. Blueberry Voyage LTD +254720856052" },
    { id: 2, name: "Did Not Pick Call", text: "Dear {Name}, we tried calling you regarding your debt with {Client Name} but got no response. Kindly call back: +254720856052" },
    { id: 3, name: "Avoiding Calls", text: "Dear {Name}, we have tried calling you severally about your debt with {Client Name}. Please call us ASAP for an amicable solution. Blueberry Voyage LTD +254720856052" },
    { id: 4, name: "Ignoring Calls", text: "Dear {Name}, you have refused to pick our calls. Prioritize settling your debt with {Client Name} to avoid escalation. Blueberry Voyage LTD +254720856052" },
    { id: 5, name: "Demand Letter Issued", text: "Dear {Name}, a demand letter has been issued to you regarding your debt with {Client Name}. Please comply to avoid strict measures. Blueberry Voyage LTD +254720856052" },
    { id: 6, name: "Demand Letter Overdue", text: "Dear {Name}, you have not complied with the demand letter for your debt with {Client Name}. Legal action may follow if no response. Blueberry Voyage LTD +254720856052" },
    { id: 7, name: "No Payment Commitment", text: "Dear {Name}, we have contacted you about your debt with {Client Name}, but no payment plan has been offered. Please settle it ASAP. Blueberry Voyage LTD +254720856052" },
    { id: 8, name: "Unresponsive Employed Debtors", text: "Dear {Name}, since you are unresponsive, we may escalate to your employer to recover your debt with {Client Name}. Call us ASAP. Blueberry Voyage LTD +254720856052" },
    { id: 9, name: "Partial Payments Reminder", text: "Dear {Name}, kindly remember to submit your partial payment for your loan with {Client Name} this month. Share proof to 0792931986. Blueberry Voyage LTD +254720856052" },
    { id: 10, name: "PTP Reminder – 2 Days to Due Date", text: "Dear {Name}, your KES {Amount} payment to {Client Name} is due in 2 days. Kindly prioritize and share proof of payment. Blueberry Voyage LTD +254720856052" },
    { id: 11, name: "PTP Reminder – 1 Day to Due Date", text: "Dear {Name}, your KES {Amount} payment to {Client Name} is due tomorrow. Kindly make the payment and send proof. Blueberry Voyage LTD +254720856052" },
    { id: 12, name: "PTP Reminder – Due Today", text: "Dear {Name}, your KES {Amount} payment to {Client Name} is due TODAY. Please pay and share proof immediately. Blueberry Voyage LTD +254720856052" },
    { id: 13, name: "PTP Reminder – 1 Day Overdue", text: "Dear {Name}, your KES {Amount} payment to {Client Name} was due yesterday. Kindly pay and send proof ASAP. Blueberry Voyage LTD +254720856052" },
    { id: 14, name: "PTP Reminder – 2 Days Overdue", text: "Dear {Name}, your KES {Amount} payment to {Client Name} is now 2 days overdue. Please settle it immediately. Blueberry Voyage LTD +254720856052" },
    { id: 15, name: "PTP Reminder – 3 Days Overdue", text: "Dear {Name}, your KES {Amount} payment to {Client Name} was not honored on {Date}. Kindly share proof of payment. Blueberry Voyage LTD +254720856052" },
    { id: 16, name: "PTP Reminder – 4 Days Overdue", text: "Dear {Name}, your KES {Amount} payment to {Client Name} is now 4 days overdue. Pay in 24hrs to avoid further action. Blueberry Voyage LTD +254720856052" },
    { id: 17, name: "PTP Reminder – 6+ Days Overdue", text: "Dear {Name}, despite our reminders, your debt with {Client Name} remains unpaid. We may escalate if no action is taken. Blueberry Voyage LTD +254720856052" },
  ];

  export const whatsappTemplates = [
    { id: 1, name: "First Outsource Notice", text: "Dear {Name}, your debt with {Client Name} has been outsourced to us for collection. Please check your email for details and contact us ASAP to set up a settlement plan. – Blueberry Voyage LTD" },
    { id: 2, name: "Did Not Pick Call", text: "Dear {Name}, we attempted to reach you regarding your outstanding debt with {Client Name} but received no response. Kindly return our call at your earliest convenience. – Blueberry Voyage LTD" },
    { id: 3, name: "Avoiding Calls", text: "Dear {Name}, we have made several attempts to reach you regarding your overdue debt with {Client Name}. Please return our calls to discuss a resolution. – Blueberry Voyage LTD" },
    { id: 4, name: "Ignoring Calls", text: "Dear {Name}, you have continuously ignored our calls regarding your debt with {Client Name}. Kindly address this matter urgently to prevent escalation. – Blueberry Voyage LTD" },
    { id: 5, name: "Demand Letter Issued", text: "Dear {Name}, a demand letter has been issued regarding your outstanding debt with {Client Name}. Please comply to avoid further action. – Blueberry Voyage LTD" },
    { id: 6, name: "Demand Letter Overdue", text: "Dear {Name}, your demand letter for your debt with {Client Name} is now overdue. Our legal team may escalate this if no action is taken. – Blueberry Voyage LTD" },
    { id: 7, name: "No Payment Commitment", text: "Dear {Name}, despite repeated contact, no payment plan has been received for your debt with {Client Name}. Please prioritize this matter. – Blueberry Voyage LTD" },
    { id: 8, name: "Unresponsive Employed Debtors", text: "Dear {Name}, since you are unresponsive, we may escalate recovery efforts, including contacting your employer regarding your debt with {Client Name}. – Blueberry Voyage LTD" },
    { id: 9, name: "Partial Payments Reminder", text: "Dear {Name}, this is a reminder to make your monthly partial payment for your debt with {Client Name}. Kindly share proof once paid. – Blueberry Voyage LTD" },
    { id: 10, name: "Payment Reminders (2, 1, 0 Days)", text: "Dear {Name}, your KES {Amount} payment to {Client Name} is due in {X} days. Kindly ensure timely payment and share proof. – Blueberry Voyage LTD" },
    { id: 11, name: "Overdue Payments (1+ Days Late)", text: "Dear {Name}, your KES {Amount} payment to {Client Name} was due on {Date} and remains unpaid. Please pay immediately to avoid escalation. – Blueberry Voyage LTD" },
  ];
  export const emailTemplates = [
    {
      id: 1,
      name: "First Debt Notice",
      subject: "URGENT: Outstanding Debt Notice",
      text: "Dear {Name},\n\nWe are reaching out to inform you that your debt with {Client Name} remains unsettled. Kindly contact us as soon as possible to discuss a repayment plan and avoid escalation.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 2,
      name: "Did Not Pick Calls",
      subject: "We Tried Calling You – Urgent Matter",
      text: "Dear {Name},\n\nWe attempted to reach you regarding your outstanding debt with {Client Name}, but we couldn’t get through. Please return our call at your earliest convenience to discuss your repayment options.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 3,
      name: "Repeatedly Ignoring Calls",
      subject: "Repeated Unanswered Calls – Immediate Action Required",
      text: "Dear {Name},\n\nDespite multiple attempts to contact you regarding your debt with {Client Name}, we have not received any response. We strongly urge you to return our calls to avoid further action.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 4,
      name: "Final Notice Before Legal Action",
      subject: "FINAL NOTICE: Legal Action May Follow",
      text: "Dear {Name},\n\nYour outstanding debt with {Client Name} remains unpaid despite our previous attempts to reach you. Failure to respond or make a payment arrangement may result in further action, including legal proceedings.\n\nPlease contact us immediately to resolve this matter.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 5,
      name: "Demand Letter Issued",
      subject: "Demand Letter Issued – Immediate Response Required",
      text: "Dear {Name},\n\nA formal demand letter has been issued regarding your outstanding debt with {Client Name}. Please comply with the instructions in the letter to avoid further escalation.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 6,
      name: "No Payment Commitment",
      subject: "Lack of Payment Commitment – Immediate Response Needed",
      text: "Dear {Name},\n\nDespite our repeated attempts to reach you, we have not received a repayment commitment for your debt with {Client Name}. Please provide an update or arrange for payment immediately.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 7,
      name: "PTP Reminder – 2 Days to Due Date",
      subject: "Reminder: Payment Due in 2 Days",
      text: "Dear {Name},\n\nThis is a friendly reminder that your agreed payment of KES {Amount} to {Client Name} is due in two days. Please ensure timely payment and share proof once completed.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 8,
      name: "PTP Reminder – 1 Day to Due Date",
      subject: "URGENT: Payment Due Tomorrow",
      text: "Dear {Name},\n\nAs agreed, your payment of KES {Amount} to {Client Name} is due tomorrow. Kindly prioritize this and share proof of payment promptly.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 9,
      name: "PTP Reminder – Due Today",
      subject: "ACTION REQUIRED: Payment Due Today",
      text: "Dear {Name},\n\nWe are reminding you that your payment of KES {Amount} to {Client Name} is due today. Kindly make the payment immediately and share proof with us.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 10,
      name: "PTP Reminder – Overdue by 2 Days",
      subject: "Overdue Payment – Immediate Action Required",
      text: "Dear {Name},\n\nYour payment of KES {Amount} to {Client Name} was due two days ago, and we have not received confirmation of payment. Please make the payment as soon as possible to avoid further action.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 11,
      name: "Request for Payment Proof",
      subject: "Payment Proof Request",
      text: "Dear {Name},\n\nWe kindly request proof of payment for your recent transaction with {Client Name}. This will allow us to update your account accordingly.\n\nPlease share the proof at your earliest convenience.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 12,
      name: "Payment Not Received – Urgent Reminder",
      subject: "URGENT: Payment Not Received",
      text: "Dear {Name},\n\nWe have not received payment for your outstanding debt with {Client Name}, despite previous reminders. Please make the payment as soon as possible to prevent further escalation.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 13,
      name: "Payment Confirmation",
      subject: "Payment Received – Thank You",
      text: "Dear {Name},\n\nWe acknowledge receipt of your payment. Thank you for your prompt action in settling your dues with {Client Name}.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 14,
      name: "Legal Escalation Notice",
      subject: "Legal Action Pending – Immediate Response Needed",
      text: "Dear {Name},\n\nSince your debt with {Client Name} remains unpaid, we are preparing to escalate the matter legally. We urge you to settle the debt immediately to avoid further complications.\n\nWarm regards,\nBlueberry Voyage LTD"
    },
    {
      id: 15,
      name: "Blocked Calls",
      subject: "We Notice You Have Blocked Our Calls",
      text: "Dear {Name},\n\nWe noticed that you have blocked our calls regarding your debt with {Client Name}. We urge you to engage with us to avoid unnecessary escalation.\n\nWarm regards,\nBlueberry Voyage LTD"
    }
  ];
