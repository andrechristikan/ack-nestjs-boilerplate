import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import logger from 'config/resources/logger';
import pagination from 'config/resources/pagination';

@Injectable()
export class ConfigService {
    private readonly env: Record<string, any>;
    private readonly configs: Record<string, any> | string | string[];

    constructor() {
        dotenv.config();
        this.env = process.env as Record<string, any>;
        this.configs = {
            pagination,
            logger,
        };
    }

    getEnv(key: string): string {
        return this.env[key];
    }

    getConfig(key: string): Record<string, any> | string | string[] | number {
        const index: string[] = key.split('.');
        let config: Record<string, any> | string | string[] | number;

        for (let i = 0; i < index.length; i += 1) {
            config = this.configs[index[i]];
        }

        return config;
    }

    isEnv(env: string): boolean {
        return this.env.APP_ENV === env;
    }
}
