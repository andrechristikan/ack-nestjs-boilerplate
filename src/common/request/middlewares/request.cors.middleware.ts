import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

/**
 * Cross-Origin Resource Sharing (CORS) middleware.
 * Manages CORS policies with origin validation, credential handling, and security controls.
 * See documentation: docs/security-and-middleware.md and docs/configuration.md
 */
@Injectable()
export class RequestCorsMiddleware implements NestMiddleware {
    private readonly allowedOrigin: string | boolean | string[];
    private readonly allowedMethod: string[];
    private readonly allowedHeader: string[];

    constructor(private readonly configService: ConfigService) {
        this.allowedOrigin = this.configService.get<
            string | boolean | string[]
        >('request.cors.allowedOrigin');
        this.allowedMethod = this.configService.get<string[]>(
            'request.cors.allowedMethod'
        );
        this.allowedHeader = this.configService.get<string[]>(
            'request.cors.allowedHeader'
        );
    }

    /**
     * Applies CORS configuration to HTTP requests.
     *
     * @param req - The Express request object
     * @param res - The Express response object
     * @param next - The next middleware function
     */
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

    /**
     * Custom origin validator for CORS configuration.
     * Handles boolean, string, and array origin types.
     * @param origin - Origin header from request
     * @param callback - Validation result callback
     */
    private originValidator(
        origin: string,
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
     * Determines if credentials should be allowed based on origin configuration.
     * Credentials are disabled for wildcard origins per CORS security spec.
     * @returns True if credentials allowed (false for wildcard origins)
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
     * Validates if origin matches allowed patterns.
     * Supports exact hostname, wildcard subdomains, and port matching.
     * @param origin - Origin URL to validate
     * @param patterns - Array of allowed patterns
     * @returns True if origin matches any pattern
     */
    isOriginAllowed(origin: string, patterns: string[]): boolean {
        // Validate origin format
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
     * Validates if a string is a valid origin.
     * Only checks for valid URL format and allowed protocols.
     *
     * @param origin - Origin string to validate
     * @returns True if origin is valid
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

    /**
     * Parses origin to extract hostname and port (protocol-agnostic).
     *
     * @param origin - Origin URL to parse
     * @returns Object containing hostname and port
     */
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

    /**
     * Parses pattern to extract hostname and port.
     * Pattern format: "hostname:port" or just "hostname"
     *
     * @param pattern - Pattern string to parse
     * @returns Object containing hostname and port
     */
    private parsePattern(pattern: string): { hostname: string; port: string } {
        const [hostname, port] = pattern.split(':');
        return {
            hostname,
            port: port ?? '',
        };
    }

    /**
     * Matches hostname and port against wildcard pattern (e.g., `*.example.com`).
     * Port must match exactly; no port wildcard support.
     * @param hostname - Hostname to match
     * @param port - Port to match
     * @param pattern - Wildcard pattern
     * @returns True if matches
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
