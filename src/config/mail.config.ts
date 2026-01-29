import nodemailer from "nodemailer";
import {
  SMTP_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASSWORD,
} from "../utils/constants";

const transporter = nodemailer.createTransport(
  {
    host: SMTP_HOST,
    port: parseInt(EMAIL_PORT as string),
    secure: true, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  },
  {
    // Default options for every email
    from: `"Skill Barter" <${EMAIL_USER}>`,
  },
);

export default transporter;
