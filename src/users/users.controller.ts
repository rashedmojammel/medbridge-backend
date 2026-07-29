import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtGuard } from '../auth/jwtGuard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';

@Controller()
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/public/doctors')
  publicDoctors(@Req() req: any) {
    const { search, specialization: spec } = req.query;
    return this.usersService.publicDoctors(search, spec);
  }

  @Get('users/public/doctors/:id')
  publicDoctorById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.publicDoctorById(id);
  }

  @Get('users/public/chws')
  publicChws(@Req() req: any) {
    const { search, area } = req.query;
    return this.usersService.publicChws(search, area);
  }

  @Get('users/public/staff')
  publicStaff(@Req() req: any) {
    const { department } = req.query;
    return this.usersService.publicStaff(department);
  }

  // --- Admin only ---

  @Get('users')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  findAll(@Req() req: any) {
    const { role, status, isPublic, search, page } = req.query;
    const isActive = status === undefined ? undefined : status === 'active';
    const publicFilter =
      isPublic === undefined ? undefined : isPublic === 'true';
    return this.usersService.findAll({
      role,
      isActive,
      isPublic: publicFilter,
      search,
      page: Number(page) || 1,
    });
  }

  @Get('users/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post('users')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('users/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
  // --- Owner or Admin — profile photo upload ---

  @Post('users/:id/photo')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}_${file.originalname}`;
          cb(null, unique);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const requester = req.user;
    if (requester.role !== UserRole.ADMIN && requester.id !== id) {
      throw new ForbiddenException('You can only update your own photo');
    }
    return this.usersService.savePhotoPath(id, `/uploads/${file.filename}`);
  }
}
