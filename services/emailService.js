const nodemailer = require("nodemailer");
const path = require("path");

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Send Application Email ─────────────────────────────────────────────────────
async function sendApplicationEmail({
  to,           // Employer email
  subject,
  intro,
  coverLetter,
  resumeFilePath,
  candidateName,
  candidateEmail,
}) {
  if (!process.env.EMAIL_USER ) {
    throw new Error("Email credentials not configured in .env");
  }

  const transporter = createTransporter();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${intro}</p>
      <hr />
      <div style="white-space: pre-line; line-height: 1.6;">
        ${coverLetter.replace(/\n/g, "<br/>")}
      </div>
      <hr />
      <p style="color: #666; font-size: 12px;">
        ${candidateName}<br/>
        ${candidateEmail}
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"${candidateName}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlBody,
    attachments: resumeFilePath
      ? [
          {
            filename: path.basename(resumeFilePath),
            path: resumeFilePath,
          },
        ]
      : [],
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId, accepted: info.accepted };
}

// ── Send Follow-up Email ───────────────────────────────────────────────────────
async function sendFollowUpEmail({
  to,
  candidateName,
  candidateEmail,
  jobTitle,
  companyName,
  appliedDate,
}) {
  if (!process.env.EMAIL_USER ) {
    throw new Error("Email credentials not configured in .env");
  }

  const transporter = createTransporter();

  const subject = `Following Up – ${jobTitle} Application – ${candidateName}`;
  const body = `Dear Hiring Manager,

I wanted to follow up on my application for the ${jobTitle} position at ${companyName}, which I submitted on ${appliedDate}.

I remain very enthusiastic about this opportunity and believe my background is an excellent match for this role. I'd welcome the chance to discuss how I can contribute to your team.

Please let me know if you need any additional information. I look forward to hearing from you.

Best regards,
${candidateName}
${candidateEmail}`;

  const mailOptions = {
    from: `"${candidateName}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: body,
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId };
}

module.exports = { sendApplicationEmail, sendFollowUpEmail };
