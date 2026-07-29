import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function addSuccessExamples(document: ReturnType<typeof SwaggerModule.createDocument>) {
  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (!operation || !('responses' in operation)) {
        continue;
      }

      const responses = operation.responses as Record<string, any>;
      const statusCode = Object.keys(responses).find((code) => code.startsWith('2')) ?? '200';
      const response = (responses[statusCode] ??= {
        description: 'Request completed successfully',
      });

      if ('$ref' in response) {
        continue;
      }

      response.content ??= {};
      response.content['application/json'] ??= {};
      response.content['application/json'].example = {
        success: true,
        data: { id: 1 },
        message: 'Request completed successfully',
      };
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Medbridge API')
    .setDescription('Rural Healthcare Consultation Platform (RHCP) backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the access token returned by `POST /auth/login`.',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  addSuccessExamples(document);
  SwaggerModule.setup(
    'api/docs',
    app,
    document,
    {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      },
    },
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
