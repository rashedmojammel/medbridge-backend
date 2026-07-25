import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { NotificationType, UserRole } from '../auth/user-role.enum';
import { Users } from '../users/users.entity';
import { Notifications } from './notifications.entity';
import { MailService } from './mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private notifRepo: Repository<Notifications>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    private mailService: MailService,
  ) {}

  /**
   * Create an in-app notification + send an email.
   *
   * - In-app notification: saved to the database (inside the caller's
   *   transaction if a manager is provided, so it rolls back together
   *   with the caller's write if anything fails).
   * - Email: fired in the background AFTER the database write, with no
   *   await — it won't slow down the response, and if it fails, the
   *   in-app notification is already saved regardless. You can't roll
   *   back an email, so it must NOT be inside the transaction.
   */
  async create(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    refId?: number,
    manager?: EntityManager,
  ) {
    // 1. save in-app notification (uses the transaction manager if provided)
    const repo = manager
      ? manager.getRepository(Notifications)
      : this.notifRepo;
    const notification = await repo.save(
      repo.create({
        user: { id: userId } as any,
        type: type,
        title: title,
        body: body,
        refId: refId,
      }),
    );

    // 2. send email in the background (fire and forget — no await)
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.email) {
      const htmlBody =
        '<h3>' +
        title +
        '</h3>' +
        '<p>' +
        body +
        '</p>' +
        '<hr>' +
        '<p style="color: gray; font-size: 12px;">This is an automated message from Medbridge. Do not reply.</p>';

      this.mailService.sendEmail(user.email, title, htmlBody);
      // no await on purpose:
      // - email takes 1-3 seconds (SMTP round trip)
      // - awaiting would slow down every API response that triggers a notification
      // - if email fails, the in-app notification is already saved
      // - you can't roll back an email anyway, so it shouldn't be in the transaction
    }

    return notification;
  }

  /**
   * Notify every active user of a given role.
   * Used for: EMERGENCY_ALERT → all doctors + all admins
   *           LOW_STOCK → all pharmacists + all admins
   */
  async createForRole(
    role: UserRole,
    type: NotificationType,
    title: string,
    body: string,
    refId?: number,
    manager?: EntityManager,
  ) {
    const usersRepo = manager ? manager.getRepository(Users) : this.usersRepo;
    const users = await usersRepo.find({
      where: { role: role, isActive: true },
    });

    for (const user of users) {
      await this.create(user.id, type, title, body, refId, manager);
    }
  }

  /** List notifications for a user, newest first, with unread count */
  async listFor(userId: number, unreadOnly: boolean = false) {
    const where: any = { user: { id: userId } };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await this.notifRepo.find({
      where: where,
      order: { createdAt: 'DESC' },
    });

    const unreadCount = await this.notifRepo.count({
      where: { user: { id: userId }, isRead: false },
    });

    return { notifications: notifications, unreadCount: unreadCount };
  }

  /** Mark one notification as read */
  async markRead(id: number, userId: number) {
    await this.notifRepo.update(
      { id: id, user: { id: userId } },
      { isRead: true },
    );
    return { success: true };
  }

  /** Mark all notifications as read */
  async markAllRead(userId: number) {
    await this.notifRepo.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }
}
