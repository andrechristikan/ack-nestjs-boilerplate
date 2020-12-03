import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';

@Injectable()
export class ConfigService {
    private readonly envs: Record<string, any>;

    constructor() {
        dotenv.config();
        this.envs = process.env as Record<string, any>;
    }

    getEnv(key: string): string{
        return this.envs[key];
    }

    isEnv(key: string): boolean {
        const env = this.envs.APP_ENV || 'development';
        return env === key;
    }
}
