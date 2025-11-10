import { Job } from "bull";
import nodemailer from "nodemailer";

import logger from "@/config/logger";
import { webSocketService } from "@/modules/realtime/websocket.service";

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  userId?: string;
  priority?: "low" | "normal" | "high";
}

class EmailProcessor {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, html, text, template, templateData, userId } =
      job.data;

    try {
      logger.info(`Processing email job ${job.id}`, {
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
      });

      let emailContent = { html, text };

      // If template is expected, render it
      if (template) {
        emailContent = await this.renderTemplate(template, templateData);
      }

      // Send email
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@opsflow.com",
        to,
        subject,
        ...emailContent,
      });

      logger.info(`Email send successfully: ${job.id}`, {
        messageId: result.messageId,
        to: Array.isArray(to) ? to.join(", ") : to,
      });

      // Send real-time notification to user if userId provided
      if (userId) {
        await webSocketService.sendNotification(userId, {
          id: `email_${job.id}`,
          type: "success",
          title: "Email Sent",
          message: `Email "${subject}" send successfully`,
          userId,
          timestamp: new Date(),
        });
      }

      // Update job progress
      await job.progress(100);
    } catch (error) {
      logger.error(`Email sending failed, ${job.id}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
      });

      // Send failure notification
      if (userId) {
        await webSocketService.sendNotification(userId, {
          id: `email_error_${job.id}`,
          type: "error",
          title: "Email failed",
          message: `Failed to send email "${subject}"`,
          userId,
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }

  private async renderTemplate(
    template: string,
    data: Record<string, unknown>,
  ): Promise<{ html: string; text: string }> {
    // Template rendering logic - you can use handlebars, mustache, etc
    const templates = {
      welcome: {
        html: `
          <h1>Welcome to OpsFlow, {{name}}!</h1>
          <p>Thank you for joining our operations management platform.</p>
          <p>Your account has been successfully created.</p>
          <a href="{{loginUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Get Started
          </a>
        `,
        text: `Welcome to OpsFlow, {{name}}! Thank you for joining our operations management platform. Your account has been successfully created. Get started: {{loginUrl}}`,
      },
      taskAssigned: {
        html: `
          <h2>New Task Assigned</h2>
          <p>Hi {{assigneeName}},</p>
          <p>You have been assigned a new task: <strong>{{taskTitle}}</strong></p>
          <p>Due date: {{dueDate}}</p>
          <p>Priority: {{priority}}</p>
          <a href="{{taskUrl}}">View Task</a>
        `,
        text: `New Task Assigned: {{taskTitle}}. Due: {{dueDate}}. Priority: {{priority}}. View: {{taskUrl}}`,
      },
      projectCompleted: {
        html: `
          <h2>Project Completed! 🎉</h2>
          <p>Congratulations! The project "{{projectName}}" has been completed.</p>
          <p>Completion date: {{completionDate}}</p>
          <a href="{{projectUrl}}">View Project Summary</a>
        `,
        text: `Project Completed: {{projectName}}. Completion date: {{completionDate}}. View: {{projectUrl}}`,
      },
    };

    const templateContent = templates[template as keyof typeof templates];
    if (!templateContent) {
      throw new Error(`Template ${template} not found`);
    }

    // Simple template replacement (in production, use a proper template engine)
    let html = templateContent.html;
    let text = templateContent.text;

    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, data[key]);
      text = text.replace(regex, data[key]);
    });

    return { html, text };
  }
}

export const emailProcessor = new EmailProcessor();
