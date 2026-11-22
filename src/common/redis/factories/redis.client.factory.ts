import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

@Injectable()
export class RedisClientFactory implements OnApplicationShutdown {
    private readonly logger = new Logger(RedisClientFactory.name);
    private readonly clients = new Set<Redis>();
    private readonly cacheUrl: string;
    private readonly cacheKeyPrefix: string;
    private readonly queueUrl: string;
    private readonly queueConnectTimeoutInMs: number;
    private readonly maxRetriesPerRequest: number;
    private readonly commandTimeoutInMs: number;
    private readonly connectTimeoutInMs: number;
    private readonly connectionNamePrefix: string;

    constructor(private readonly configService: ConfigService) {
        this.cacheUrl = this.configService.get<string>('redis.cache.url')!;
        const namespace = this.configService.get<string>(
            'redis.cache.namespace'
        )!;
        this.cacheKeyPrefix = `${namespace}:`;
        this.queueUrl = this.configService.get<string>('redis.queue.url')!;
        this.queueConnectTimeoutInMs = this.configService.get<number>(
            'redis.queue.connectTimeoutInMs'
        )!;
        this.maxRetriesPerRequest = this.configService.get<number>(
            'redis.queue.maxRetriesPerRequest'
        )!;
        this.commandTimeoutInMs = this.configService.get<number>(
            'redis.commandTimeoutInMs'
        )!;
        this.connectTimeoutInMs = this.configService.get<number>(
            'redis.connectTimeoutInMs'
        )!;

        const appName = this.configService.get<string>('app.name')!;
        const appEnv = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.connectionNamePrefix = `${appName}-${appEnv}`;
    }

    private onError(client: Redis, error: Error): void {
        this.logger.warn(
            { connectionName: client.options.connectionName, err: error },
            'Redis connection lost'
        );
    }

    private onReady(client: Redis): void {
        this.logger.log(
            { connectionName: client.options.connectionName },
            'Redis connection ready'
        );
    }

    private async close(client: Redis): Promise<void> {
        if (client.status === 'ready') {
            await client.quit();
            return;
        }

        client.disconnect();
    }

    createCache(): Redis {
        return new Redis(this.cacheUrl, {
            lazyConnect: true,
            enableOfflineQueue: false,
            commandTimeout: this.commandTimeoutInMs,
            connectTimeout: this.connectTimeoutInMs,
            keyPrefix: this.cacheKeyPrefix,
            connectionName: `${this.connectionNamePrefix}:cache`,
        });
    }

    createQueue(): Redis {
        return new Redis(this.queueUrl, {
            lazyConnect: true,
            enableOfflineQueue: false,
            connectTimeout: this.queueConnectTimeoutInMs,
            maxRetriesPerRequest: this.maxRetriesPerRequest,
            connectionName: `${this.connectionNamePrefix}:queue`,
        });
    }

    createQueueWorker(): Redis {
        return new Redis(this.queueUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: null,
            connectionName: `${this.connectionNamePrefix}:processor`,
        });
    }

    async connect(client: Redis): Promise<Redis> {
        this.clients.add(client);
        client.on('error', (error: Error) => this.onError(client, error));
        client.on('ready', () => this.onReady(client));

        try {
            await client.connect();
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Connecting to Redis failed');
        }

        return client;
    }

    async onApplicationShutdown(): Promise<void> {
        await Promise.all([...this.clients].map(client => this.close(client)));
    }
}
