import {
  Module,
  Global,
  OnModuleDestroy,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { DatabaseModule } from "../database/db.module.js";

export const ORDER_PROCESSING_QUEUE = "dropshipping-process-order";

function parseRedisConnection(url: string): {
  host: string;
  port: number;
  password?: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
  };
}

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: "ORDER_QUEUE",
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
        return new Queue(ORDER_PROCESSING_QUEUE, {
          connection: parseRedisConnection(redisUrl),
          defaultJobOptions: {
            removeOnComplete: { count: 5_000 },
            removeOnFail: { count: 2_000 },
            attempts: 3,
            backoff: { type: "exponential", delay: 10_000 },
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ["ORDER_QUEUE"],
})
export class MessagingModule implements OnModuleDestroy {
  private readonly logger = new Logger(MessagingModule.name);

  constructor(@Inject("ORDER_QUEUE") private readonly queue: Queue) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queue.close();
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to close queue: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
