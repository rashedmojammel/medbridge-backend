import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '../auth/user-role.enum';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('MAIL_HOST'),
      port: config.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
    this.fromAddress = config.get(
      'MAIL_FROM',
      'Medbridge <noreply@medbridge.com>',
    );
  }

  /** Send a styled email based on notification type */
  async sendNotificationEmail(
    to: string,
    recipientName: string,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const template = this.buildTemplate(recipientName, type, title, body);

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: to,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error('Email failed to ' + to + ':', error.message);
    }
  }

  /** Build subject line and HTML body based on notification type */
  private buildTemplate(
    recipientName: string,
    type: NotificationType,
    title: string,
    body: string,
  ): { subject: string; html: string } {
    // each type gets its own emoji, color, and subject prefix
    let emoji = '🔔';
    let color = '#2563eb'; // blue (default)
    let subjectPrefix = 'Notification';
    let actionText = '';
    let actionUrl = '';

    switch (type) {
      case NotificationType.EMERGENCY_ALERT:
        emoji = '🚨';
        color = '#dc2626'; // red
        subjectPrefix = 'URGENT';
        actionText = 'View Patient Now';
        actionUrl = '/chw/dashboard';
        break;

      case NotificationType.PRESCRIPTION_READY:
        emoji = '💊';
        color = '#16a34a'; // green
        subjectPrefix = 'Prescription Ready';
        actionText = 'View Prescription';
        actionUrl = '/patient/prescriptions';
        break;

      case NotificationType.APPOINTMENT_REMINDER:
        emoji = '📅';
        color = '#9333ea'; // purple
        subjectPrefix = 'Appointment Reminder';
        actionText = 'View Appointment';
        actionUrl = '/patient/appointments';
        break;

      case NotificationType.LOW_STOCK:
        emoji = '⚠️';
        color = '#ea580c'; // orange
        subjectPrefix = 'Low Stock Alert';
        actionText = 'Check Inventory';
        actionUrl = '/pharmacist/inventory';
        break;

      case NotificationType.ASSIGNMENT:
        emoji = '📋';
        color = '#2563eb'; // blue
        subjectPrefix = 'New Assignment';
        actionText = 'View Details';
        actionUrl = '/doctor/dashboard';
        break;
    }

    const subject = emoji + ' [' + subjectPrefix + '] ' + title;
    const frontendUrl = this.config.get('CORS_ORIGIN', 'http://localhost:3000');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${color}; padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #ffffff; font-size: 24px; font-weight: bold;">
                    🏥 Medbridge
                  </td>
                  <td align="right" style="color: #ffffff; font-size: 14px;">
                    ${subjectPrefix}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <p style="margin: 0; font-size: 16px; color: #374151;">
                Hello ${recipientName},
              </p>
            </td>
          </tr>

          <!-- Alert box -->
          <tr>
            <td style="padding: 16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${color}10; border-left: 4px solid ${color}; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: ${color};">
                      ${emoji} ${title}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.5;">
                      ${body}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action button -->
          ${
            actionText
              ? `
          <tr>
            <td align="center" style="padding: 8px 32px 24px 32px;">
              <a href="${frontendUrl}${actionUrl}"
                 style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: bold;">
                ${actionText}
              </a>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Timestamp -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                Sent on ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
                    <p style="margin: 0;">
                      🏥 <strong>Medbridge</strong> — Rural Healthcare Consultation Platform
                    </p>
                    <p style="margin: 4px 0 0 0;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                    <p style="margin: 4px 0 0 0;">
                      If you believe you received this in error, contact your system administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject: subject, html: html };
  }
}
