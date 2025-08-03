import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

// TODO: FIX THIS
@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);

    constructor(private readonly configService: ConfigService) {}

    /**
     * Called when the module is initialized.
     * Sets up the MongoDB profiler if configured.
     */
    async onModuleInit(): Promise<void> {
        this.logger.log('Initializing DatabaseService...');
        await this.setupProfiler();
        this.logger.log('DatabaseService initialized successfully.');
    }

    /**
     * Sets up MongoDB profiler after connection is established.
     * This should be called after the database connection is ready.
     */
    async setupProfiler(): Promise<void> {
        const slowQueryThreshold = this.configService.get<number>(
            'database.slowQueryThreshold'
        );
        const sampleRate = this.configService.get<number>(
            'database.sampleRate'
        );

        if (slowQueryThreshold <= 0) {
            this.logger.warn(
                'Profiler not set due to slowQueryThreshold being 0 or less.'
            );
            return;
        }

        const command = {
            profile: 1,
            slowms: slowQueryThreshold,
            sampleRate: sampleRate,
        };

        await mongoose.connection.db.command(command);

        this.logger.log(
            `Profiler set with slowQueryThreshold: ${slowQueryThreshold}ms and sampleRate: ${sampleRate}`
        );
    }
}
