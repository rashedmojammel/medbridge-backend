import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { NotificationType, UserRole } from '../auth/user-role.enum';
import { Users } from '../users/users.entity';
import { Notifications } from './notifications.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private notifRepo: Repository<Notifications>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
  ) {}

  async create(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    refId?: number,
    manager?: EntityManager,
  ) {
    const repo = manager
      ? manager.getRepository(Notifications)
      : this.notifRepo;
    return repo.save(
      repo.create({ user: { id: userId } as any, type, title, body, refId }),
    );
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
    const users = await usersRepo.find({ where: { role, isActive: true } });
    for (const u of users) {
      await this.create(u.id, type, title, body, refId, manager);
    }
  }

  /** FR-9.2 */
  async listFor(userId: number, unreadOnly = false) {
    const where: any = { user: { id: userId } };
    if (unreadOnly) where.isRead = false;
    const notifications = await this.notifRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const unreadCount = await this.notifRepo.count({
      where: { user: { id: userId }, isRead: false },
    });
    return { notifications, unreadCount };
  }

  async markRead(id: number, userId: number) {
    await this.notifRepo.update({ id, user: { id: userId } }, { isRead: true });
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
