import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { ConfigService } from '@nestjs/config';

/**
 * Cross-Origin Resource Sharing (CORS) middleware.
 * Configures CORS policies for allowed origins, methods, and headers with credential handling.
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
     * Supports protocol-agnostic matching with strict port validation.
     *
     * @param origin - Origin header from the request
     * @param callback - Callback function to execute with validation result
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
     * Credentials cannot be used with wildcard (*) origins.
     *
     * @returns True if credentials should be allowed
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
     * Validates if an origin URL matches any of the allowed patterns.
     * - Protocol agnostic (http/https both allowed)
     * - Port must match exactly (no wildcard)
     * - Supports wildcard subdomain matching
     *
     * @param origin - Origin URL to validate (e.g., "https://app.example.com:3000")
     * @param patterns - Array of allowed patterns (e.g., ["*.example.com", "trusted.com:8080"])
     * @returns True if origin matches any allowed pattern
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

            if (!url.hostname) {
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
                port: url.port || '',
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
            hostname: hostname || '',
            port: port || '',
        };
    }

    /**
     * Matches hostname and port against a wildcard pattern.
     * Only supports leading wildcard (*.example.com).
     * Port must match exactly - no wildcard support.
     *
     * @param hostname - Hostname to match
     * @param port - Port to match (empty string for default ports)
     * @param pattern - Pattern to match against (may include wildcard)
     * @returns True if hostname and port match the pattern
     *
     * @example
     * matchWildcardOrigin("api.example.com", "", "*.example.com") // true
     * matchWildcardOrigin("api.example.com", "3000", "*.example.com:3000") // true
     * matchWildcardOrigin("api.example.com", "3000", "*.example.com") // false (port mismatch)
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
