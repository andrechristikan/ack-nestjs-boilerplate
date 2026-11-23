import { RequestCorsOriginSchemeRegex } from '@common/request/constants/request.constant';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RequestCorsMiddleware implements NestMiddleware {
    private readonly allowedOrigins: string[];
    private readonly allowedMethods: string[];
    private readonly allowedHeaders: string[];
    private readonly exposedHeaders: string[];
    private readonly maxAgeInSeconds: number;

    constructor(private readonly configService: ConfigService) {
        this.allowedOrigins = this.configService.get<string[]>(
            'request.cors.allowedOrigins'
        )!;
        this.allowedMethods = this.configService.get<string[]>(
            'request.cors.allowedMethods'
        )!;
        this.allowedHeaders = this.configService.get<string[]>(
            'request.cors.allowedHeaders'
        )!;
        this.exposedHeaders = this.configService.get<string[]>(
            'request.cors.exposedHeaders'
        )!;
        this.maxAgeInSeconds = this.configService.get<number>(
            'request.cors.maxAgeInSeconds'
        )!;
    }

    private originValidator(
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
    ): void {
        if (!origin) {
            return callback(null, true);
        }

        const hasWildcardOrigin = this.allowedOrigins.includes('*');
        if (hasWildcardOrigin) {
            return callback(null, true);
        }

        const allowed = this.isOriginAllowed(origin, this.allowedOrigins);
        callback(null, allowed);
    }

    private shouldAllowCredentials(): boolean {
        const hasWildcardOrigin = this.allowedOrigins.includes('*');

        return !hasWildcardOrigin;
    }

    private isOriginAllowed(origin: string, patterns: string[]): boolean {
        const isValidOrigin = this.isValidOrigin(origin);
        if (!isValidOrigin) {
            return false;
        }

        const parsedOrigin = this.parseOrigin(origin);

        return patterns.some(pattern => {
            const parsedPattern = this.parsePattern(pattern);
            if (
                parsedPattern.protocol !== null &&
                parsedPattern.protocol !== parsedOrigin.protocol
            ) {
                return false;
            }

            const port = this.normalizePort(
                parsedPattern.protocol ?? parsedOrigin.protocol,
                parsedPattern.port
            );
            if (port !== parsedOrigin.port) {
                return false;
            }

            if (!parsedPattern.hostname.includes('*')) {
                return parsedPattern.hostname === parsedOrigin.hostname;
            }

            return this.matchWildcardHostname(
                parsedOrigin.hostname,
                parsedPattern.hostname
            );
        });
    }

    private isValidOrigin(origin: string): boolean {
        try {
            const url = new URL(origin);

            if (!['http:', 'https:'].includes(url.protocol)) {
                return false;
            }

            if (url.pathname !== '/' || url.search || url.hash) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    private parseOrigin(origin: string): {
        protocol: string;
        hostname: string;
        port: string;
    } {
        try {
            const url = new URL(origin);
            return {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
            };
        } catch {
            return { protocol: '', hostname: '', port: '' };
        }
    }

    private parsePattern(pattern: string): {
        protocol: string | null;
        hostname: string;
        port: string;
    } {
        const scheme = RequestCorsOriginSchemeRegex.exec(pattern);
        const authority =
            scheme === null ? pattern : pattern.slice(scheme[0].length);
        const parts = authority.split(':');

        return {
            protocol: scheme === null ? null : `${scheme[1]!.toLowerCase()}:`,
            hostname: parts[0]!.toLowerCase(),
            port: parts[1] ?? '',
        };
    }

    private normalizePort(protocol: string, port: string): string {
        if (
            (protocol === 'http:' && port === '80') ||
            (protocol === 'https:' && port === '443')
        ) {
            return '';
        }

        return port;
    }

    private matchWildcardHostname(
        hostname: string,
        patternHostname: string
    ): boolean {
        if (!patternHostname.startsWith('*.')) {
            return false;
        }

        const baseDomain = patternHostname.slice(2);

        return hostname.endsWith(`.${baseDomain}`) || hostname === baseDomain;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const isCredentialsAllowed = this.shouldAllowCredentials();
        const corsOptions: CorsOptions = {
            origin: (origin, callback) =>
                this.originValidator(origin, callback),
            methods: this.allowedMethods,
            allowedHeaders: this.allowedHeaders,
            exposedHeaders: this.exposedHeaders,
            preflightContinue: false,
            credentials: isCredentialsAllowed,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
            maxAge: this.maxAgeInSeconds,
        };

        cors(corsOptions)(req, res, next);
    }
}
