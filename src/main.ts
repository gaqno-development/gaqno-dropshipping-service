import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import {
  GaqnoExceptionFilter,
  createStripApiPrefixMiddleware,
} from "@gaqno-development/backcore";
import { getCorsOptions } from "@gaqno-development/backcore";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(createStripApiPrefixMiddleware("/dropshipping"));
  app.enableCors(getCorsOptions(config));

  app.setGlobalPrefix("v1");
  app.useGlobalFilters(
    new GaqnoExceptionFilter({
      useNestLoggerFor500: true,
      serviceName: "dropshipping-service",
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>("PORT") ?? 4016;
  await app.listen(port, "0.0.0.0");
  console.log(`Dropshipping Service is running on: http://0.0.0.0:${port}`);
}

bootstrap();
