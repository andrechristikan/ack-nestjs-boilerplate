import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

/**
 * Applies CORS with configured origin validation and credential handling.
 */
@Injectable()
export class RequestCorsMiddleware implements NestMiddleware {
    private readonly allowedOrigin: string | boolean | string[];
    private readonly allowedMethod: string[];
    private readonly allowedHeader: string[];

    constructor(private readonly configService: ConfigService) {
        this.allowedOrigin = this.configService.get<
            string | boolean | string[]
        >('request.cors.allowedOrigin')!;
        this.allowedMethod = this.configService.get<string[]>(
            'request.cors.allowedMethod'
        )!;
        this.allowedHeader = this.configService.get<string[]>(
            'request.cors.allowedHeader'
        )!;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const corsOptions: CorsOptions = {
            origin: (origin, callback) =>
                this.originValidator(origin, callback),
            methods: this.allowedMethod,
            allowedHeaders: this.allowedHeader,
            preflightContinue: false,
            credentials: this.shouldAllowCredentials(),
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
            maxAge: 86400,
        };

        cors(corsOptions)(req, res, next);
    }

    private originValidator(
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
    ): void {
        if (!origin) {
            return callback(null, true);
        }

        if (typeof this.allowedOrigin === 'boolean') {
            return callback(null, this.allowedOrigin);
        }

        if (typeof this.allowedOrigin === 'string') {
            if (this.allowedOrigin === '*') {
                return callback(null, true);
            }

            const allowed = this.isOriginAllowed(origin, [this.allowedOrigin]);
            return callback(null, allowed);
        }

        if (Array.isArray(this.allowedOrigin)) {
            if (this.allowedOrigin.includes('*')) {
                return callback(null, true);
            }

            const allowed = this.isOriginAllowed(origin, this.allowedOrigin);
            return callback(null, allowed);
        }

        callback(null, false);
    }

    /**
     * Credentials are disabled for wildcard origins, per the CORS security spec.
     */
    private shouldAllowCredentials(): boolean {
        if (typeof this.allowedOrigin === 'string') {
            return this.allowedOrigin !== '*';
        }
        if (Array.isArray(this.allowedOrigin)) {
            return !this.allowedOrigin.includes('*');
        }
        return true;
    }

    /**
     * Matches an origin against patterns by exact hostname/port or wildcard subdomain.
     */
    private isOriginAllowed(origin: string, patterns: string[]): boolean {
        if (!this.isValidOrigin(origin)) {
            return false;
        }

        const { hostname, port } = this.parseOrigin(origin);

        for (const pattern of patterns) {
            const exactMatch = this.parsePattern(pattern);
            if (hostname === exactMatch.hostname && port === exactMatch.port) {
                return true;
            }
        }

        return patterns.some(pattern => {
            if (!pattern.includes('*')) {
                return false;
            }

            return this.matchWildcardOrigin(hostname, port, pattern);
        });
    }

    /**
     * Accepts only well-formed http(s) origins with no path, query, or hash.
     */
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

    private parseOrigin(origin: string): { hostname: string; port: string } {
        try {
            const url = new URL(origin);
            return {
                hostname: url.hostname,
                port: url.port ?? '',
            };
        } catch {
            return { hostname: '', port: '' };
        }
    }

    private parsePattern(pattern: string): { hostname: string; port: string } {
        const [hostname, port] = pattern.split(':');
        return {
            hostname,
            port: port ?? '',
        };
    }

    /**
     * Matches `*.example.com`-style wildcards; port must match exactly (no port wildcard).
     */
    private matchWildcardOrigin(
        hostname: string,
        port: string,
        pattern: string
    ): boolean {
        const { hostname: patternHostname, port: patternPort } =
            this.parsePattern(pattern);

        if (port !== patternPort) {
            return false;
        }

        if (patternHostname.startsWith('*.')) {
            const baseDomain = patternHostname.slice(2);

            return (
                hostname.endsWith('.' + baseDomain) || hostname === baseDomain
            );
        }

        if (patternHostname.includes('*')) {
            return false;
        }

        return false;
    }
}
