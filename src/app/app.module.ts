import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { AppMiddlewareModule } from '@app/app.middleware.module';
import { WorkerModule } from '@workers/worker.module';
import { RouterModule } from '@router';

/**
 * Main application module that serves as the root module for the NestJS application.
 *
 * This module orchestrates the entire application by importing and configuring
 * all necessary modules including shared utilities, middleware, routing, and
 * background processing capabilities.
 *
 * @module AppModule
 *
 * Architecture:
 * - **CommonModule**: Provides shared utilities, database, logging, and core services
 * - **AppMiddlewareModule**: Configures security, CORS, rate limiting, and request processing
 * - **RouterModule**: Handles API routing and endpoint definitions
 * - **WorkerModule**: Manages background jobs and asynchronous processing
 */
@Module({
    controllers: [],
    providers: [],
    imports: [
        // Common
        CommonModule,
        AppMiddlewareModule,

        // Routes
        RouterModule,

        // Workers
        WorkerModule,
    ],
})
export class AppModule {}
