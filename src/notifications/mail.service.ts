import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

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
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: to,
        subject: subject,
        html: body,
      });
    } catch (error) {
      // log but don't crash — email is a bonus, not critical
      console.error('Email failed:', error.message);
    }
  }
}
