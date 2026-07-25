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
    @InjectRepository(Notifications) private notifRepo: Repository<Notifications>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    private mailService: MailService,
  ) {}

  async create(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    refId?: number,
    manager?: EntityManager,
  ) {
    // 1. save in-app notification
    const repo = manager ? manager.getRepository(Notifications) : this.notifRepo;
    const notification = await repo.save(
      repo.create({
        user: { id: userId } as any,
        type: type,
        title: title,
        body: body,
        refId: refId,
      }),
    );

    // 2. send styled email in the background
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.email) {
      // no await — fire and forget so the API response isn't delayed
      this.mailService.sendNotificationEmail(
        user.email,
        user.fullName,
        type,
        title,
        body,
      );
    }

    return notification;
  }

  async createForRole(
    role: UserRole,
    type: NotificationType,
    title: string,
    body: string,
    refId?: number,
    manager?: EntityManager,
  ) {
    const usersRepo = manager ? manager.getRepository(Users) : this.usersRepo;
    const users = await usersRepo.find({ where: { role: role, isActive: true } });

    for (const user of users) {
      await this.create(user.id, type, title, body, refId, manager);
    }
  }

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

  async markRead(id: number, userId: number) {
    await this.notifRepo.update(
      { id: id, user: { id: userId } },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.notifRepo.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }
}