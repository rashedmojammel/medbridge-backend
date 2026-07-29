import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtGuard)
@ApiTags('notifications')
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** #40 */
  @Get()
  list(@Req() req: any) {
    const { unread } = req.query;
    return this.notificationsService.listFor(req.user.id, unread === 'true');
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  /** #42 */
  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
