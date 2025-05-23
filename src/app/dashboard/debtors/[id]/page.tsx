"use client";

import { SetStateAction, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { FaEdit, FaPhone, FaSms, FaEnvelope, FaWhatsapp, FaFilePdf } from "react-icons/fa";
import Spinner from "@/components/Spinner";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import { smsTemplates, whatsappTemplates, emailTemplates } from "@/components/templates";
import { ClipLoader } from "react-spinners";

export default function DebtorDetailsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { id } = useParams();
  const [debtor, setDebtor] = useState<{
    debt_amount: number;
    debtor_name: string;
    client: string;
    debtor_phone: string;
    debtor_email: string;
    debtor_secondary_phone?: string;
    address?: string;
    job_title?: string;
    tags?: string;
    id_number?: string;
    assigned_to?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [agents, setAgents] = useState<{ id: any; full_name: any }[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [collectionUpdateLogs, setCollectionUpdateLogs] = useState<any[]>([]);
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const colorCycle = ["#1e40af", "#000000", "#e11d48"]; // blue, black, red
  // Follow-Up Fields
  const [dealStage, setDealStage] = useState("0");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Admin Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedDebtor, setEditedDebtor] = useState<{ [key: string]: any }>({});

  // PtP and Collection Updates
  const [ptpDate, setPtpDate] = useState("");
  const [ptpAmount, setPtpAmount] = useState("");
  const [collectionUpdateDate, setCollectionUpdateDate] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");

  // Logs
  const [ptpLogs, setPtpLogs] = useState<any[]>([]);

  // Modals for Call, SMS, Email, and WhatsApp
  const [showCallModal, setShowCallModal] = useState(false);
  const [debtorPhone, setDebtorPhone] = useState("");
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  const handleShowDemandModal = () => {
    setShowDemandModal(true);
  };

  const [colorIndex, setColorIndex] = useState(0);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setColorIndex((prev) => (prev + 1) % colorCycle.length);
      }, 700); // change color every 700ms
      return () => clearInterval(interval);
    }, []);

  const dealStages = [
    { value: "0", label: "Select" },
    { value: "1", label: "Outsource Email" },
    { value: "13", label: "No Contact Provided" },
    { value: "27", label: "On Hold" },
    { value: "16", label: "Requesting more Information" },
    { value: "22", label: "Invalid Email" },
    { value: "21", label: "Invalid Number" },
    { value: "15", label: "Wrong Number" },
    { value: "2", label: "Introduction Call" },
    { value: "19", label: "Out of Service" },
    { value: "18", label: "Not in Service" },
    { value: "24", label: "Phone Switched Off" },
    { value: "17", label: "Calls Dropped" },
    { value: "25", label: "Follow Up-Email" },
    { value: "3", label: "Ringing No Response" },
    { value: "20", label: "Requested Call Back" },
    { value: "4", label: "Field Visit Meeting" },
    { value: "5", label: "Negotiation in progress" },
    { value: "23", label: "PTP" },
    { value: "7", label: "Scheduled Payment" },
    { value: "8", label: "One-Off Payment" },
    { value: "9", label: "Payment Confirmed by Client" },
    { value: "10", label: "Debt Settled" },
    { value: "14", label: "Non-Committal" },
    { value: "11", label: "Disputing" },
    { value: "12", label: "Legal" },
    { value: "26", label: "Requesting More Information" },
    { value: "27", label: "Wrong Number" },
    { value: "28", label: "Phone switched off" },
    { value: "29", label: "No contact provided" },
    { value: "30",   label: "On Hold"},
    { value: "31",   label: "Invalid Email"},
    { value: "32",   label: "Invalid Phone Number"},
    { value: "33",   label: "Out of Service"},
    { value: "34",   label: "Not in Service"},
    { value: "45", label: "Account closed"},
    {value: "46", label: "Account Recalled"},
    { value: "46", label: "Buy-off in Progress" },
  { value: "47", label: "Check-off Payment" },
  { value: "49", label: "Pending" },
  { value: "48", label: "Pending Booking" }
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role, id")
          .eq("id", user.id)
          .single();

        setUserRole(userData?.role);

        const { data, error } = await supabase
          .from("debtors")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data?.assigned_to) {
          const { data: agentData, error: agentError } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", data.assigned_to)
            .single();

          if (agentError) throw agentError;
          if (agentData) {
            data.assigned_to = agentData.full_name;
          }
        }

        setDebtor(data);
        setEditedDebtor(data);
        setDealStage(data.deal_stage || "0");
        setFollowUpDate(data.next_followup_date || "");
        setLoading(false);

        const { data: paymentData } = await supabase
          .from("payments")
          .select("*")
          .eq("debtor_id", id);

        setPayments(paymentData || []);

        const { data: followUpData } = await supabase
          .from("follow_ups")
          .select("*")
          .eq("debtor_id", id);

        setFollowUps(followUpData || []);

        fetchPtpLogs();
        fetchCollectionUpdateLogs();
        fetchEventLogs();
      } catch (error) {
        console.error("Error fetching data:", error);
        router.push("/dashboard/debtors");
      }
    }

    fetchData();
  }, [supabase, id, router]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("role", "agent");

        if (error) throw error;
        setAgents(data);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    }

    fetchAgents();
  }, [supabase]);

  async function updateDebtor() {
    try {
      const { error: followUpError } = await supabase.from("follow_ups").insert({
        debtor_id: id,
        status: dealStage,
        notes: notes,
        follow_up_date: new Date().toISOString(),
        agent_id: userRole === "agent" ? (await supabase.auth.getUser()).data.user?.id : null,
      });

      if (followUpError) throw followUpError;

      const { error: updateError } = await supabase
        .from("debtors")
        .update({
          deal_stage: dealStage,
          next_followup_date: followUpDate,
          collection_update: notes,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      alert("Debtor updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error updating debtor:", error);
      alert("Error updating debtor: " );
    }
  }

  async function updateDebtorDetails() {
    try {
      const updatedDebtor = { ...editedDebtor };
      for (const key in updatedDebtor) {
        if (updatedDebtor[key] === "") {
          updatedDebtor[key] = null;
        }
      }

      const { error } = await supabase
        .from("debtors")
        .update(updatedDebtor)
        .eq("id", id);

      if (error) throw error;

      const { error: followUpError } = await supabase
        .from("follow_ups")
        .update({ agent_id: updatedDebtor.assigned_to })
        .eq("debtor_id", id);

      if (followUpError) {
        console.error("Error updating follow_ups table:", followUpError.message);
      }

      alert("Debtor details updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error updating debtor details:", error);
      if (error instanceof Error) {
        alert("Error updating debtor details: " + error.message);
      } else {
        alert("Error updating debtor details.");
      }
    }
  }

  async function logPtp() {
    try {
      const { error } = await supabase.from("ptp").insert({
        debtor_id: id,
        ptp_date: ptpDate,
        ptp_amount: parseFloat(ptpAmount),
        total_debt: debtor ? debtor.debt_amount : 0,
        agent_id: userRole === "agent" ? (await supabase.auth.getUser()).data.user?.id : null,
      });

      if (error) throw error;

      alert("PtP logged successfully!");
      fetchPtpLogs();
    } catch (error) {
      console.error("Error logging PtP:", error);
      alert("Error logging PtP: " );
    }
  }

  async function logCollectionUpdate() {
    try {
      const { error } = await supabase.from("collection_updates").insert({
        debtor_id: id,
        update_date: collectionUpdateDate,
        collection_notes: collectionNotes,
        agent_id: userRole === "agent" ? (await supabase.auth.getUser()).data.user?.id : null,
      });

      if (error) throw error;

      alert("Collection update logged successfully!");
      fetchCollectionUpdateLogs();
    } catch (error) {
      console.error("Error logging collection update:", error);
      alert("Error logging collection update: " );
    }
  }

  async function fetchPtpLogs() {
    try {
      const { data } = await supabase.from("ptp").select("*").eq("debtor_id", id);
      setPtpLogs(data || []);
    } catch (error) {
      console.error("Error fetching PtP logs:", error);
    }
  }

  async function fetchCollectionUpdateLogs() {
    try {
      const { data } = await supabase.from("collection_updates").select("*").eq("debtor_id", id);
      setCollectionUpdateLogs(data || []);
    } catch (error) {
      console.error("Error fetching collection update logs:", error);
    }
  }

  async function fetchEventLogs() {
    try {
      const { data, error } = await supabase
        .from("event_logs")
        .select("*")
        .eq("debtor_id", id)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setEventLogs(data);
    } catch (error) {
      console.error("Error fetching event logs:", error);
    }
  }

  const logEvent = async (action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("event_logs").insert({
        debtor_id: id,
        action: action,
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        user_role: userRole,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error logging event:", error);
    }
  };

  const handleCallDebtor = () => {
    logEvent("call_debtor");
    if (debtor?.debtor_phone) {
      initiateCall(debtor.debtor_phone);
    }
  };

  const handleSendSms = () => {
    logEvent("send_sms");
    setShowSmsModal(true);
  };

  const handleSendEmail = () => {
    logEvent("send_email");
    setShowEmailModal(true);
  };

  const handleSendWhatsApp = () => {
    logEvent("send_whatsapp");
    setShowWhatsAppModal(true);
  };

  //Download demand letter function
  const generateDemandLetterPDF = async (debtor: any) => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(currentDate.getDate() + 7);

      // Format Dates
      const formattedCurrentDate = currentDate.toLocaleDateString();
      const formattedDueDate = dueDate.toLocaleDateString();
      const currentTimestamp = new Date().toLocaleString();

      // Cloudinary Image URLs
      const logoUrl = "https://res.cloudinary.com/dylmsnibf/image/upload/v1741289166/unnamed_1_uptcpl.png";
      const signatureUrl = "https://res.cloudinary.com/dylmsnibf/image/upload/v1741969895/WhatsApp_Image_2025-03-14_at_19.23.39_6437f7fa-removebg-preview_k1r8kl.png";

      // Load images
      const [logo, signature] = await Promise.all([loadImage(logoUrl), loadImage(signatureUrl)]);

      // Add Logo (Top Right)
      doc.addImage(logo as HTMLImageElement, "JPEG", 150, 10, 50, 30);
      doc.setTextColor(255, 0, 0); // Red color
      doc.setFontSize(10);
      doc.text("Here for your success", 160, 40); // Adjust position as needed
      doc.setTextColor(0, 0, 0); // Reset to black color
      // Spacing Adjustment
      let yOffset = 50;

      // Header Section (Bold Labels, Normal Values)
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text("Our Ref:", 15, yOffset);
      doc.setFont("times", "normal");
      doc.text("SNI/CRMD/2025", 45, yOffset);
      // Debtor Details Section
       yOffset += 8;
       doc.setFont("times", "bold");
      // doc.text("Debtor Name:", 15, yOffset);
       doc.setFont("times", "normal");
       doc.text(debtor?.debtor_name || "", 45, yOffset);

       yOffset += 8;
       doc.setFont("times", "bold");
      // doc.text("Phone Number:", 15, yOffset);
       doc.setFont("times", "normal");
       doc.text(debtor?.debtor_phone || "", 45, yOffset);

       yOffset += 8;
       doc.setFont("times", "bold");
      // doc.text("Email:", 15, yOffset);
       doc.setFont("times", "normal");
       doc.text(debtor?.debtor_email || "", 45, yOffset);

      // Salutation
      yOffset += 12;
      doc.setFont("times", "bold");
      doc.text("Dear Sir/Madam,", 15, yOffset);

      // Title
      yOffset += 15;
      doc.setFontSize(12);
      doc.text(`RE: DEMAND OF KES ${debtor?.debt_amount.toLocaleString()} AS OWED TO ${debtor?.client}.`, 15, yOffset);

      // Body Text (Moved Lower)
      yOffset += 10;
      doc.setFontSize(11);
      doc.setFont("times", "normal");

      const bodyText = `
  We refer to the subject and contractual agreement with our client ${debtor?.client}.

  Please note that you have failed to honour payments, neglected and/or refused to pay back KES ${debtor?.debt_amount.toLocaleString()} owed to our client ${debtor?.client} for account(s)- ${debtor?.debtor_name}.

  TAKE NOTE that you have ignored all our client’s reminders and requests and/or appeals to settle this debt. You have further failed to honor the agreed payment plans and to far extent given false payment promises.

  TAKE FURTHER NOTICE that Sary Network International Ltd being a fully appointed agent for ${debtor?.client} hereby formally demands settlement of the FULL amount of KES ${debtor?.debt_amount.toLocaleString()} within 7 DAYS as owed to our client from the date hereof, failure to which we shall proceed and institute recovery measures for the said amount plus costs.

  Payment SHOULD be made directly to our client’s bank account and the payment receipt shared to finance@sni.co.ke BEFORE ${formattedDueDate}.

  Please take further note that a delay in payment beyond the aforementioned date shall constitute automatic recovery costs of 20% of the total debt; this cost shall be incurred by yourselves.

  Be advised accordingly and oblige to avoid escalation.

  Payment to be made directly to ${debtor?.client}.
  `;

      const textLines = doc.splitTextToSize(bodyText, 180);
      doc.text(textLines, 15, yOffset);

      // Move Signature Section Higher
      yOffset = doc.internal.pageSize.height - 70;
     // Signature Section
doc.setFont("times", "bold");
doc.text("Sincerely,", 15, yOffset);

// Add Signature Image Directly Below "Sincerely,"
doc.addImage(signature as HTMLImageElement, "PNG", 15, yOffset + 5, 60, 20);

// Move Text Below the Signature
yOffset += 30;
doc.text("Susan Karigi", 15, yOffset);
doc.text("Director", 15, yOffset + 5);
doc.text("Sary Network International Ltd", 15, yOffset + 10);

      // Footer Function
        const renderDebtCardFooter = async (doc: jsPDF, currentTimestamp: string) => {
            const footerY = Math.max(doc.internal.pageSize.height - 40, yOffset + 10);

            doc.setFontSize(9);
            doc.setTextColor(150, 0, 0); // Dark Red for emphasis
            doc.setTextColor(128, 0, 128); // Purple color
            doc.setFontSize(10);
            doc.text("8th Floor, Western Heights, Karuna Rd, Westland, Nairobi| E: info@sni.co.ke W: www.sni.co.ke", doc.internal.pageSize.width / 2, footerY + 12, { align: "center" });
            doc.text("Mobile: +254 700 314 522 | Office: +254 720 856 052", doc.internal.pageSize.width / 2, footerY + 17, { align: "center" });
            doc.setTextColor(0, 0, 0); // Reset to black color
        };

        // Call footer function before saving
        await renderDebtCardFooter(doc, currentTimestamp);
        doc.save(`Sary_Demand_Letter_${debtor?.debtor_name}.pdf`);
    } catch (error) {
      alert(error);
    }
  };

  // Function to Load Image
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  };
const downloadStatement = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", user?.id)
            .single();

        const [letterheadImg, stampImg, signatureImg] = await Promise.all([
            loadImage('https://res.cloudinary.com/dylmsnibf/image/upload/v1740623140/sary_2_fjgiao.jpg') as Promise<HTMLImageElement>,
            loadImage('https://res.cloudinary.com/dylmsnibf/image/upload/v1741970134/more_squeezed_image_1_lss3wl.png') as Promise<HTMLImageElement>,
            loadImage('https://res.cloudinary.com/dylmsnibf/image/upload/v1741969895/WhatsApp_Image_2025-03-14_at_19.23.39_6437f7fa-removebg-preview_k1r8kl.png') as Promise<HTMLImageElement>,
        ]);

        const doc = new jsPDF();
        const currentDate = new Date().toLocaleDateString();
        const currentTimestamp = new Date().toLocaleString();

        // Add Letterhead
        doc.addImage(letterheadImg as HTMLImageElement, 'JPEG', 10, 10, 50, 30);

        // Header Section
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 128);
        doc.text("Sary Network International", 70, 20);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("8th Floor, Western Heights, Westlands, Nairobi", 70, 25);
        doc.text("Phone: +254 700 314 522", 70, 30);
        doc.text("Email: info@sni.co.ke", 70, 35);
        doc.text("Nairobi, Kenya", 70, 40);

        // Title Section
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont("times", "bold");
        doc.text("DEBTOR STATEMENT", doc.internal.pageSize.width / 2, 60, { align: "center" });
        doc.setFont("times", "normal");

        // Date Section
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width - 50, 70);

        let yOffset = 80;

        // Debtor Information Section
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 128);
        doc.text(`Debtor: ${debtor?.debtor_name || ''}`, 15, yOffset);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Client: ${debtor?.client}`, 15, yOffset + 10);
        doc.text(`Phone: ${debtor?.debtor_phone}`, 15, yOffset + 15);
        doc.text(`Email: ${debtor?.debtor_email}`, 15, yOffset + 20);
        doc.text(`Debt Amount: KES ${debtor?.debt_amount.toLocaleString()}`, 15, yOffset + 25);

        yOffset += 35;

        // Payment History Table
        if (payments.length > 0) {
            doc.text("Payment History:", 15, yOffset);
            yOffset += 5;

            // Draw table header
            const tableWidth = 180; // Increased width to accommodate the new column
            const startX = 15;
            const startY = yOffset;

            // Draw header row
            doc.setLineWidth(0.5);
            doc.rect(startX, startY, tableWidth, 7);
            doc.text("Date Posted", startX + 5, startY + 5);
            doc.text("Date Paid", startX + 50, startY + 5); // New column header
            doc.text("Amount", startX + 100, startY + 5);
            doc.text("Verified", startX + 150, startY + 5);

            // Draw data rows
            yOffset += 7;
            payments.forEach((payment, index) => {
                const datePosted = new Date(payment.uploaded_at).toLocaleDateString();
                const datePaid = new Date(payment.payment_date).toLocaleDateString(); // Fetching date paid
                const amount = `KES ${payment.amount.toLocaleString()}`;

                // Draw row
                doc.rect(startX, yOffset, tableWidth, 7);
                doc.text(datePosted, startX + 5, yOffset + 5);
                doc.text(datePaid, startX + 50, yOffset + 5); // Adding date paid
                doc.text(amount, startX + 100, yOffset + 5);
                doc.text(payment.verified ? "Yes" : "No", startX + 150, yOffset + 5);

                yOffset += 7;
            });

            // Add extra space after the table
            yOffset += 15;

            // Calculate Total Payments and Balance
            const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const balance = (debtor?.debt_amount ?? 0) - totalPayments;

            doc.text(`Total Payments: KES ${totalPayments.toLocaleString()}`, 15, yOffset);
            yOffset += 15;
            doc.text(`Balance: KES ${balance.toLocaleString()}`, 15, yOffset);
            yOffset += 15;
        } else {
            doc.text("No payment records available.", 15, yOffset);
            yOffset += 10;
        }

        // Add Stamp & Signature
        const pageWidth = doc.internal.pageSize.width;
        const signatureWidth = 78;
        const stampWidth = 70;
        const shiftLeft = 12;
        const shiftRight = 50;
        const signatureX = (pageWidth - signatureWidth) / 2 - shiftLeft;
        const signatureY = doc.internal.pageSize.height - 80;
        const stampX = (pageWidth - stampWidth) / 2 + shiftRight;
        const stampY = signatureY - 20;

        doc.addImage(stampImg as HTMLImageElement, "PNG", stampX, stampY, stampWidth, stampWidth);
        doc.addImage(signatureImg as HTMLImageElement, "PNG", signatureX, signatureY, signatureWidth, 16);

        // Draw Signature Line
        const lineStartX = signatureX - 10;
        const lineEndX = signatureX + signatureWidth + 10;
        const lineY = signatureY + 18;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(lineStartX, lineY, lineEndX, lineY);

        // Signature text
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("Hillary Wekesa", (pageWidth / 2) - shiftLeft, doc.internal.pageSize.height - 55, { align: "center" });
        doc.text("Managing Partner", (pageWidth / 2) - shiftLeft, doc.internal.pageSize.height - 50, { align: "center" });

        // Footer Function
        const renderDebtCardFooter = async (doc: jsPDF, currentTimestamp: string) => {
            const footerY = Math.max(doc.internal.pageSize.height - 40, yOffset + 10);

            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text("This is an official statement from Sary Network International.", 15, footerY);
            doc.text(`Generated on: ${currentTimestamp} by: ${userData?.full_name}`, 15, doc.internal.pageSize.height - 35);

            doc.setFontSize(9);
            doc.setTextColor(150, 0, 0); // Dark Red for emphasis
            doc.text("Important: This statement presents the account balance at the time of generation. Please be aware that this balance is subject to change.", 15, footerY + 12);
            doc.text(" The creditor reserves the right to assess and apply further interest, penalties, or other charges as stipulated in the", 15, footerY + 17);
            doc.text("governing contract between the debtor and creditor.", 15, footerY + 22);
            doc.text("", 15, footerY + 27);
        };

        // Call footer function before saving
        await renderDebtCardFooter(doc, currentTimestamp);
        doc.save(`Sary_Statement_${debtor?.debtor_name}.pdf`);
    } catch (error) {
        alert(error);
    }
};


  const downloadDebtCard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      const [letterheadImg, stampImg, signatureImg] = await Promise.all([
        loadImage('https://res.cloudinary.com/dylmsnibf/image/upload/v1740623140/sary_2_fjgiao.jpg'),
        loadImage('https://res.cloudinary.com/dylmsnibf/image/upload/v1741970134/more_squeezed_image_1_lss3wl.png'),
        loadImage('https://res.cloudinary.com/dylmsnibf/image/upload/v1741969895/WhatsApp_Image_2025-03-14_at_19.23.39_6437f7fa-removebg-preview_k1r8kl.png'),
      ]);

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    const currentTimestamp = new Date().toLocaleString();
    let yOffset = 80;

    // Function to draw a divider line if needed
    const drawSectionDivider = (doc: jsPDF, yOffset: number) => {
      if (yOffset > 80) {
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(15, yOffset, doc.internal.pageSize.width - 15, yOffset);
        return yOffset + 5;
      }
      return yOffset;
    };

    // Function to add wrapped text (prevents overflow)
    const addWrappedText = (doc: jsPDF, label: string, text: string, x: number, y: number) => {
      doc.setFont("times", "bold");
      doc.text(`${label}:`, x, y);
      doc.setFont("times", "normal");

      const wrappedText = doc.splitTextToSize(text || "N/A", doc.internal.pageSize.width - 50);
      doc.text(wrappedText, x + 35, y);
      return y + wrappedText.length * 5;
    };

    // Add Letterhead
    doc.addImage(letterheadImg as HTMLImageElement, 'JPEG', 10, 10, 50, 30);

    // Header Section
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 128);
    doc.text("Sary Network International", 70, 20);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("8th Floor, Western Heights, Westlands, Nairobi", 70, 25);
    doc.text("Phone: +254 700 314 522", 70, 30);
    doc.text("Email: info@sni.co.ke", 70, 35);
    doc.text("Nairobi, Kenya", 70, 40);

    // Title Section
    doc.setFontSize(18);
    doc.setFont("times", "bold");
    doc.text("DEBT CARD", doc.internal.pageSize.width / 2, 60, { align: "center" });

    // Date Section
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width - 50, 70);

    // Debtor Information Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 128);
    doc.text(`Debtor: ${debtor?.debtor_name}`, 15, yOffset);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    yOffset = addWrappedText(doc, "Client", debtor?.client || "N/A", 15, yOffset + 10);
    yOffset = addWrappedText(doc, "Phone", debtor?.debtor_phone || "N/A", 15, yOffset + 5);
    yOffset = addWrappedText(doc, "Email", debtor?.debtor_email || "N/A", 15, yOffset + 5);
    yOffset = addWrappedText(doc, "Debt Amount", `KES ${debtor?.debt_amount.toLocaleString()}`, 15, yOffset + 5);

    yOffset += 10;

    // Follow-Up History Section (Notes wrapped)
    if (followUps.length > 0) {
      yOffset = drawSectionDivider(doc, yOffset);
      doc.text("Follow-Up History:", 15, yOffset);
      yOffset += 5;
      followUps.forEach((followUp) => {
        const date = new Date(followUp.follow_up_date).toLocaleDateString();
        yOffset = addWrappedText(doc, "Date", date, 15, yOffset);
        const stateLabel = dealStages.find(stage => stage.value === followUp.status)?.label || "Unknown";
        yOffset = addWrappedText(doc, "State", stateLabel, 15, yOffset + 5);
        yOffset = addWrappedText(doc, "Notes", followUp.notes || "N/A", 15, yOffset);
      });
    }

    // Payment History
    if (payments.length > 0) {
      yOffset = drawSectionDivider(doc, yOffset);
      doc.text("Payment History:", 15, yOffset);
      yOffset += 5;
      payments.forEach((payment) => {
        const date = new Date(payment.payment_date).toLocaleDateString();
        yOffset = addWrappedText(doc, "Date", date, 15, yOffset);
        yOffset = addWrappedText(doc, "Amount", `KES ${payment.amount.toLocaleString()}`, 15, yOffset);
      });
    }

    // Signature & Stamp Section
    if (yOffset + 100 > doc.internal.pageSize.height) {
      doc.addPage();
      yOffset = 20;
    }

    const pageWidth = doc.internal.pageSize.width;
    const signatureX = (pageWidth - 78) / 2 - 12;
    const signatureY = yOffset + 20;
    const stampX = (pageWidth - 70) / 2 + 50;
    const stampY = signatureY - 20;

    doc.addImage(stampImg as HTMLImageElement, "PNG", stampX, stampY, 70, 70);
    doc.addImage(signatureImg as HTMLImageElement, "PNG", signatureX, signatureY, 78, 16);

    // Signature Line
    const lineStartX = signatureX - 10;
    const lineEndX = signatureX + 78 + 10;
    const lineY = signatureY + 18;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(lineStartX, lineY, lineEndX, lineY);

    // Signature Text
    doc.setFontSize(11);
    doc.text("Hillary Wekesa", (pageWidth / 2) - 12, lineY + 5, { align: "center" });
    doc.text("Managing Partner", (pageWidth / 2) - 12, lineY + 10, { align: "center" });

    // Footer for Debt Card
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text("This is an official debt card of Sary Network International.", 15, doc.internal.pageSize.height - 20);
    doc.text(`Generated on: ${currentTimestamp} by: ${userData?.full_name}`, 15, doc.internal.pageSize.height - 30);

    // Save the document
    doc.save(`Sary_Debt_Card_${debtor?.debtor_name}.pdf`);
  } catch (error) {
    alert(error);
  }
};

  // Call Function (WebRTC Modal)
const initiateCall = (phoneNumber: string) => {
  // Replaced +254 prefix with 0
  const modifiedPhoneNumber = phoneNumber.startsWith("+254")
    ? phoneNumber.replace("+254", "0")
    : phoneNumber;

  const width = 400;
  const height = 500;
  const top = window.screen.height - height - 30;
  const left = window.screen.width - width - 30;
  const windowFeatures = `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,location=no`;
  const popupWindow = window.open(
    `https://kenyavoice.rpdigitalphone.com/Browser-Phone/Phone/indexNew.php?mobile=${encodeURIComponent(modifiedPhoneNumber)}`,
    "PopupWindow",
    windowFeatures
  );
};

  // SMS Function
  const sendSms = async (phoneNumber: string, message: string) => {

    const payload = { to: phoneNumber, message };
    console.log("Sending request payload:", payload);

    try {
      const response = await fetch("https://app.sary.co.ke/api/smsleopard/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        alert("SMS sent successfully!");
      } else {
        console.error("Error sending SMS:", responseData);
        alert("Error sending SMS: " + (responseData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. Please try again.");
    }
  };

  // Email Function
  const sendEmail = async (email: string, subject: string, body: string) => {
    if (!email || !subject || !body) {
      alert("Please fill all fields.");
      return;
    }

    const bodyWithLineBreaks = body.replace(/\n/g, "<br>");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, body: bodyWithLineBreaks }),
      });

      if (response.ok) {
        alert("Email sent successfully!");
      } else {
        const errorData = await response.json();
        console.error("Error sending email:", errorData);
        alert("Error sending email: " + (errorData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Network error or server down:", error);
      alert("Network error or server is down. Please try again later.");
    }
    setShowEmailModal(false);
  };

  // WhatsApp Function
  const sendWhatsAppMessage = (phoneNumber: string, message: string | number | boolean) => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappLink, "_blank");
    setShowWhatsAppModal(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white">
        {/* Sidebar */}
        <div className={`fixed left-0 top-0 h-full transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <Navbar handleLogout={async () => {
            await supabase.auth.signOut();
            await router.push("/login");
          }} />
        </div>
  
        {/* Main Loading Area */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex items-center justify-center`}>
          <div className="text-center">
            <ClipLoader color={colorCycle[colorIndex]} size={60} />
            <h2 className="text-xl font-semibold text-blue-950 mt-4 animate-pulse">Please wait...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
       <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Debtor Details</h2>
          {userRole === "admin" && (
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-gray-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FaEdit className="mr-2" /> Edit Debtor
            </button>
          )}
        </div>

        {/* Call, SMS, Email, and WhatsApp Buttons */}
        <div className="flex gap-4 mb-6">
  {userRole !== 'client' && (
    <>
      <button
        onClick={handleCallDebtor}
        className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
      >
        <FaPhone className="mr-2" /> Call Debtor
      </button>
      <button
        onClick={handleSendSms}
        className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
      >
        <FaSms className="mr-2" /> Send SMS
      </button>
      <button
        onClick={handleSendEmail}
        className="bg-purple-600 text-white px-4 py-2 rounded-md flex items-center"
      >
        <FaEnvelope className="mr-2" /> Send Email
      </button>
      <button
        onClick={handleSendWhatsApp}
        className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center"
      >
        <FaWhatsapp className="mr-2" /> Send WhatsApp
      </button>
      <button
        onClick={() => generateDemandLetterPDF(debtor)}
        className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center"
      >
        <FaFilePdf className="mr-2" /> Download Demand Letter
      </button>
    </>
  )}
  <button
    onClick={downloadStatement}
    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
  >
    Download Statement
  </button>
  <button
    onClick={downloadDebtCard}
    className="bg-purple-600 text-white px-4 py-2 rounded-md flex items-center"
  >
    Download Debt Card
  </button>
</div>

        {/* Debtor Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold">Basic Information</h3>
          <p><strong>Name:</strong> {debtor?.debtor_name}</p>
          <p><strong>Client:</strong> {debtor?.client}</p>
          <p><strong>Phone:</strong> {debtor?.debtor_phone}</p>
          <p><strong>Secondary Phone:</strong> {debtor?.debtor_secondary_phone || "N/A"}</p>
          <p><strong>Email:</strong> {debtor?.debtor_email || "N/A"}</p>
          <p><strong>Address:</strong> {debtor?.address || "N/A"}</p>
          <p><strong>Debt Amount:</strong> KES {debtor?.debt_amount.toLocaleString()}</p>
          <p><strong>Job Title:</strong> {debtor?.job_title || "N/A"}</p>
          <p><strong>Tags:</strong> {debtor?.tags || "N/A"}</p>
          <p><strong>ID Number:</strong> {debtor?.id_number || "N/A"}</p>
          <p><strong>Assigned To:</strong> {debtor?.assigned_to || "N/A"}</p>
          {/* Total Paid and Balance */}
          <p>
            <strong>Total Amount Paid:</strong>{" "}
            KES {payments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
          </p>
          <p>
            <strong>Debt Balance:</strong>{" "}
            KES {((debtor?.debt_amount ?? 0) - payments.reduce((sum, payment) => sum + payment.amount, 0)).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-6">
  {userRole !== 'client' && (
    <>
   {/* Follow-Up Section */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6 flex-1">
  <h3 className="text-xl font-semibold">Follow-Up Details</h3>

  <label className="block">Update Follow-Up Stage:</label>
  <select
    className="border p-2 rounded-md w-full"
    value={dealStage}
    onChange={(e) => setDealStage(e.target.value)}
  >
    <option value="" disabled>Select Follow-Up Stage</option>
    {dealStages.map((stage) => (
      <option key={stage.value} value={stage.value}>
        {stage.label}
      </option>
    ))}
  </select>

  <label className="block">Next Follow-Up Date:</label>
  <input
  className="border p-2 rounded-md w-full"
  type="date"
  value={followUpDate}
  min={new Date().toISOString().split("T")[0]} // Today
  max={
    dealStage === "45"
      ? undefined // No limit for dealStage 45
      : ["23", "7", "8"].includes(dealStage)
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // Restrict to today + 30 days
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // Restrict to today + 7 days
  }
  onChange={(e) => setFollowUpDate(e.target.value)}
/>


  <label className="block">Notes:</label>
  <textarea
    className="border p-2 rounded-md w-full"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
  />

  <button
    onClick={() => {
      if (!dealStage) {
        alert("Please select a valid Follow-Up Stage.");
        return;
      }
      updateDebtor();
    }}
    className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4"
  >
    Save Follow-up Details
  </button>
</div>


      {/* PtP Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex-1">
        <h3 className="text-xl font-semibold">Promise to Pay (PtP)</h3>
        <label className="block">PtP Date:</label>
        <input
          className="border p-2 rounded-md w-full"
          type="date"
          value={ptpDate}
          onChange={(e) => setPtpDate(e.target.value)}
        />
        <label className="block">PtP Amount:</label>
        <input
          className="border p-2 rounded-md w-full"
          type="number"
          value={ptpAmount}
          onChange={(e) => setPtpAmount(e.target.value)}
        />
        <button onClick={logPtp} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
          Log PtP
        </button>
      </div>

      {/* Collection Update Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex-1">
        <h3 className="text-xl font-semibold">Collection Update</h3>
        <label className="block">Update Date:</label>
        <input
          className="border p-2 rounded-md w-full"
          type="date"
          value={collectionUpdateDate}
          onChange={(e) => setCollectionUpdateDate(e.target.value)}
        />
        <label className="block">Collection Notes:</label>
        <textarea
          className="border p-2 rounded-md w-full"
          value={collectionNotes}
          onChange={(e) => setCollectionNotes(e.target.value)}
        />
        <button onClick={logCollectionUpdate} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
          Log Collection Update
        </button>
      </div>
    </>
  )}
</div>

{/* PtP History */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6">
  <h3 className="text-xl font-semibold mt-6">PtP History</h3>
  {ptpLogs.length > 0 ? (
    <ul>
      {ptpLogs
        .sort((a, b) => new Date(b.ptp_date).getTime() - new Date(a.ptp_date).getTime()) // Sort descending
        .map((ptp) => (
          <li key={ptp.id} className="mb-4">
            <p><strong>PtP Date:</strong> {new Date(ptp.ptp_date).toLocaleDateString()}</p>
            <p><strong>PtP Amount:</strong> KES {ptp.ptp_amount.toLocaleString()}</p>
            <p><strong>Total Debt:</strong> KES {ptp.total_debt.toLocaleString()}</p>
            <p><strong>Logged At:</strong> {new Date(ptp.created_at).toLocaleString()}</p>
          </li>
        ))}
    </ul>
  ) : (
    <p>No PtP history found.</p>
  )}
</div>

{/* Collection Update History */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6">
  <h3 className="text-xl font-semibold mt-6">Collection Update History</h3>
  {collectionUpdateLogs.length > 0 ? (
    <ul>
      {collectionUpdateLogs
        .sort((a, b) => new Date(b.update_date).getTime() - new Date(a.update_date).getTime())
        .map((update) => (
          <li key={update.id} className="mb-4">
            <p><strong>Update Date:</strong> {new Date(update.update_date).toLocaleDateString()}</p>
            <p><strong>Collection Notes:</strong> {update.collection_notes}</p>
            <p><strong>Logged At:</strong> {new Date(update.created_at).toLocaleString()}</p>
          </li>
        ))}
    </ul>
  ) : (
    <p>No collection update history found.</p>
  )}
</div>

{/* Payment History */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6">
  <h3 className="text-xl font-semibold">Payment History</h3>
  {payments.length > 0 ? (
    <ul>
      {payments
        .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
        .map((payment) => (
          <li key={payment.id} className="mb-4">
            <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
            <p><strong>Proof of Payment:</strong> <a href={payment.pop_url} target="_blank" rel="noopener noreferrer">View</a></p>
            <p><strong>Verified:</strong> {payment.verified ? "Yes" : "No"}</p>
            <p><strong>Posted At:</strong> {new Date(payment.uploaded_at).toLocaleString()}</p>
          </li>
        ))}
    </ul>
  ) : (
    <p>No payment history found.</p>
  )}
</div>

{/* Follow-Up History */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6">
  <h3 className="text-xl font-semibold">Follow-Up History</h3>
  {followUps.length > 0 ? (
    <ul>
      {followUps
        .sort((a, b) => new Date(b.follow_up_date).getTime() - new Date(a.follow_up_date).getTime())
        .map((followUp) => {
          const statusLabel = dealStages.find(stage => stage.value === followUp.status)?.label || followUp.status;
          return (
            <li key={followUp.id} className="mb-4">
              <p><strong>Status:</strong> {statusLabel}</p>
              <p><strong>Follow-Up Date:</strong> {new Date(followUp.follow_up_date).toLocaleDateString()}</p>
              <p><strong>Notes:</strong> {followUp.notes}</p>
              <p><strong>Created At:</strong> {new Date(followUp.created_at).toLocaleString()}</p>
            </li>
          );
        })}
    </ul>
  ) : (
    <p>No follow-up history found.</p>
  )}
</div>

{/* Event Logs */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6">
  <h3 className="text-xl font-semibold mt-6">Event Logs</h3>
  {eventLogs.length > 0 ? (
    <ul>
      {eventLogs.map((log) => (
        <li key={log.id} className="mb-4">
          <p><strong>Action:</strong> {log.action}</p>
          <p><strong>Timestamp:</strong> {new Date(log.timestamp).toLocaleString()}</p>
          <p><strong>User Role:</strong> {log.user_role}</p>
        </li>
      ))}
    </ul>
  ) : (
    <p>No event logs found.</p>
  )}
</div>

        {/* Admin Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Edit Debtor</h3>

              <div className="grid grid-cols-2 gap-4">
                {debtor && Object.keys(debtor)
                  .filter((field) => field !== "client_id")
                  .map((field) => (
                    <div key={field}>
                      <label className="block font-medium text-gray-700">{field.replace("_", " ")}:</label>
                      <input
                        className="border p-2 rounded-md w-full"
                        type="text"
                        value={editedDebtor[field] || ""}
                        onChange={(e) => setEditedDebtor({ ...editedDebtor, [field]: e.target.value })}
                      />
                    </div>
                  ))}
                <div>
                  <label className="block font-medium text-gray-700">Assigned To:</label>
                  <select
                    className="border p-2 rounded-md w-full"
                    value={editedDebtor.assigned_to || ""}
                    onChange={(e) => setEditedDebtor({ ...editedDebtor, assigned_to: e.target.value })}
                  >
                    <option value="">Select an agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={updateDebtorDetails}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

{/* SMS Modal */}
<SmsModal
  showSmsModal={showSmsModal}
  setShowSmsModal={setShowSmsModal}
  debtor={debtor}
  sendSms={sendSms}
/>

{/* Email Modal */}
<EmailModal
  showEmailModal={showEmailModal}
  setShowEmailModal={setShowEmailModal}
  debtor={debtor}
  sendEmail={sendEmail}
/>

{/* WhatsApp Modal */}
<WhatsAppModal
  showWhatsAppModal={showWhatsAppModal}
  setShowWhatsAppModal={setShowWhatsAppModal}
  debtor={debtor}
/>
      </main>
    </div>
  );
}

interface SmsModalProps {
  showSmsModal: boolean;
  setShowSmsModal: (value: boolean) => void;
  debtor: {
    debtor_name: string;
    client: string;
    debtor_phone: string;
  } | null;
  sendSms: (phoneNumber: string, message: string) => void;
}

function SmsModal({ showSmsModal, setShowSmsModal, debtor, sendSms }: SmsModalProps) {
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const handleTemplateSelect = (templateId: SetStateAction<string>) => {
    const template = smsTemplates.find((t) => t.id === parseInt(templateId as string));
    if (template) {
      let text = template.text
        .replace("{Name}", debtor?.debtor_name || "")
        .replace("{Client Name}", debtor?.client || "");

      setSelectedTemplate(templateId);
      setSmsMessage(text);
    }
  };

  return (
    showSmsModal && (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg w-[400px]">
          <h3 className="text-xl font-semibold mb-4">Send SMS</h3>
          <h4 className="text-xl font-medium mb-2 text-red-600" >When sending a message involving a cash<strong>AMOUNT</strong> and <strong>DATE</strong> , please edit it manually. Thanks</h4>

          {/* Template Selection Dropdown */}
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
          <select
            className="w-full p-2 border rounded-md mb-4"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
          >
            <option value="">-- Choose Template --</option>
            {smsTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Message Input */}
          <label className="block">Message:</label>
          <textarea
            className="border p-2 rounded-md w-full"
            value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)}
            maxLength={155} // Prevent exceeding SMS limit
          />

          {/* Character Count */}
          <p className={`text-sm mt-2 ${smsMessage.length > 155 ? "text-red-600" : "text-gray-500"}`}>
            {smsMessage.length}/155 characters
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setShowSmsModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => debtor?.debtor_phone && sendSms(debtor.debtor_phone, smsMessage)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
              disabled={smsMessage.length > 155}
            >
              Send SMS
            </button>
          </div>
        </div>
      </div>
    )
  );
}

interface WhatsAppModalProps {
  showWhatsAppModal: boolean;
  setShowWhatsAppModal: (value: boolean) => void;
  debtor: {
    debtor_name: string;
    client: string;
    debtor_phone: string;
  } | null;
}

function WhatsAppModal({ showWhatsAppModal, setShowWhatsAppModal, debtor }: WhatsAppModalProps) {
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const handleTemplateSelect = (templateId: SetStateAction<string>) => {
    const template = whatsappTemplates.find((t) => t.id === parseInt(templateId as string));
    if (template) {
      let text = template.text
        .replace("{Name}", debtor?.debtor_name || "")
        .replace("{Client Name}", debtor?.client || "");

      setSelectedTemplate(templateId);
      setWhatsappMessage(text);
    }
  };

  const sendWhatsApp = () => {
    if (debtor?.debtor_phone) {
      const encodedMessage = encodeURIComponent(whatsappMessage);
      window.open(`https://wa.me/${debtor.debtor_phone}?text=${encodedMessage}`, "_blank");
    }
  };

  return (
    showWhatsAppModal && (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg w-[400px]">
          <h3 className="text-xl font-semibold mb-4">Send WhatsApp Message</h3>
          <h4 className="text-xl font-medium mb-2 text-red-600" >When sending a message involving a cash <strong>AMOUNT</strong> and <strong>DATE</strong>, please edit it manually. Thanks</h4>

          {/* Template Selection Dropdown */}
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
          <select
            className="w-full p-2 border rounded-md mb-4"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
          >
            <option value="">-- Choose Template --</option>
            {whatsappTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Message Input */}
          <label className="block">Message:</label>
          <textarea
            className="border p-2 rounded-md w-full"
            value={whatsappMessage}
            onChange={(e) => setWhatsappMessage(e.target.value)}
            rows={5} // More space for long WhatsApp messages
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={sendWhatsApp}
              className="bg-green-600 text-white px-4 py-2 rounded-md"
            >
              Send WhatsApp
            </button>
          </div>
        </div>
      </div>
    )
  );
}

interface EmailModalProps {
  showEmailModal: boolean;
  setShowEmailModal: (value: boolean) => void;
  debtor: {
    debtor_name: string;
    client: string;
    debtor_email: string;
  } | null;
  sendEmail: (email: string, subject: string, body: string) => void;
}

function EmailModal({ showEmailModal, setShowEmailModal, debtor, sendEmail }: EmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const handleTemplateSelect = (templateId: SetStateAction<string>) => {
    const template = emailTemplates.find((t) => t.id === parseInt(templateId as string));
    if (template) {
      let text = template.text
        .replace("{Name}", debtor?.debtor_name || "")
        .replace("{Client Name}", debtor?.client || "");

      setSelectedTemplate(templateId);
      setEmailSubject(template.subject);
      setEmailBody(text);
    }
  };

  const handleSendEmail = () => {
    if (!debtor?.debtor_email) {
      alert("Debtor email not available.");
      return;
    }
    sendEmail(debtor.debtor_email, emailSubject, emailBody);
  };

  return (
    showEmailModal && (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg w-[500px]">
          <h3 className="text-xl font-semibold mb-4">Send Email</h3>

          {/* Select Template Dropdown */}
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
          <select
            className="w-full p-2 border rounded-md mb-4"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
          >
            <option value="">-- Choose Template --</option>
            {emailTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Email Subject Input */}
          <label className="block">Subject:</label>
          <input
            type="text"
            className="border p-2 rounded-md w-full mb-4"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />

          {/* Email Body Input */}
          <label className="block">Message:</label>
          <textarea
            className="border p-2 rounded-md w-full"
            rows={6}
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setShowEmailModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Send Email
            </button>
          </div>
        </div>
      </div>
    )
  );
}
