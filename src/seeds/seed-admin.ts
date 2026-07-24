import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../auth/user-role.enum';

async function bootstrap() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding an administrator.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const usersService = app.get(UsersService);
    const existing = await usersService.findByEmail(email);

    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        throw new Error(
          `The email ${email} already belongs to a ${existing.role} account.`,
        );
      }
      console.log(`Administrator ${email} already exists.`);
      return;
    }

    await usersService.create({
      fullName: process.env.ADMIN_FULL_NAME || 'MedBridge Administrator',
      email,
      phone: process.env.ADMIN_PHONE || '+8801700000000',
      password,
      role: UserRole.ADMIN,
    });
    console.log(`Administrator ${email} created.`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
