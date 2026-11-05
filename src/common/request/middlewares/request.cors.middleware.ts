import { HttpStatus, Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

/**
 * Applies CORS with configured origin validation and credential handling.
 */
@Injectable()
export class RequestCorsMiddleware implements NestMiddleware {
    private readonly allowedOrigin: string | boolean | string[];
    private readonly allowedMethod: string[];
    private readonly allowedHeader: string[];
    private readonly exposedHeader: string[];

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
        this.exposedHeader = this.configService.get<string[]>(
            'request.cors.exposedHeader'
        )!;
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
            const hasWildcardOrigin = this.allowedOrigin.includes('*');
            if (hasWildcardOrigin) {
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
            const hasWildcardOrigin = this.allowedOrigin.includes('*');

            return !hasWildcardOrigin;
        }
        return true;
    }

    /**
     * Matches an origin against patterns by scheme (when the pattern names one), hostname, and
     * port, with the default port of the scheme normalized, or by wildcard subdomain.
     */
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

    /**
     * Splits a pattern into its optional scheme, lowercased hostname, and port.
     */
    private parsePattern(pattern: string): {
        protocol: string | null;
        hostname: string;
        port: string;
    } {
        const scheme = /^(https?):\/\//i.exec(pattern);
        const authority =
            scheme === null ? pattern : pattern.slice(scheme[0].length);
        const parts = authority.split(':');

        return {
            protocol: scheme === null ? null : `${scheme[1]!.toLowerCase()}:`,
            hostname: parts[0]!.toLowerCase(),
            port: parts[1] ?? '',
        };
    }

    /**
     * Empties the default port of its scheme, the form `URL` reports for an origin.
     */
    private normalizePort(protocol: string, port: string): string {
        if (
            (protocol === 'http:' && port === '80') ||
            (protocol === 'https:' && port === '443')
        ) {
            return '';
        }

        return port;
    }

    /**
     * Matches `*.example.com`-style wildcards against a hostname; the base domain matches too.
     */
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
            methods: this.allowedMethod,
            allowedHeaders: this.allowedHeader,
            exposedHeaders: this.exposedHeader,
            preflightContinue: false,
            credentials: isCredentialsAllowed,
            optionsSuccessStatus: HttpStatus.NO_CONTENT,
            maxAge: 86400,
        };

        cors(corsOptions)(req, res, next);
    }
}
