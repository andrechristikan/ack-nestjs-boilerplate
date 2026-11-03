import type { Breadcrumb, Event, Log, RequestEventData } from '@sentry/nestjs';
import {
    LoggerRedactedValue,
    LoggerSensitiveFields,
    LoggerSentryBodyKeys,
    LoggerSentryHeaderKeyPrefixes,
    LoggerSentryQueryKeys,
    LoggerSentryRedactMaxDepth,
    LoggerSentryUrlKeys,
    LoggerUrlEncodedPairRegex,
    LoggerUrlStaticSegmentRegex,
} from '@common/logger/constants/logger.constant';

/**
 * Redacts credentials and identifiers from a Sentry event, breadcrumb, or log before it leaves the
 * process. It injects nothing, so `src/instrument.ts` builds it before Nest boots.
 */
export class SentryUtil {
    private readonly sensitiveFields = new Set(
        LoggerSensitiveFields.map(field => field.toLowerCase())
    );

    private maskPath(path: string): string {
        return path
            .split('/')
            .map(segment =>
                !segment || LoggerUrlStaticSegmentRegex.test(segment)
                    ? segment
                    : LoggerRedactedValue
            )
            .join('/');
    }

    private maskUrl(url: string): string {
        try {
            const parsed = new URL(url);
            const path = this.maskPath(parsed.pathname);

            return `${parsed.origin}${path}`;
        } catch {
            return this.maskPath(url.split('?')[0]!.split('#')[0]!);
        }
    }

    private maskName(name: string): string {
        const separator = name.indexOf(' ');
        if (separator === -1) {
            return name;
        }

        const target = name.slice(separator + 1);
        if (!/^(?:\/|https?:\/\/)/.test(target)) {
            return name;
        }

        const maskedTarget = this.maskUrl(target);

        return `${name.slice(0, separator)} ${maskedTarget}`;
    }

    private isSensitiveKey(key: string): boolean {
        return this.sensitiveFields.has(key.toLowerCase());
    }

    private isSensitiveFormKey(key: string): boolean {
        return key
            .split(/[[\].]/)
            .some(segment => this.isSensitiveKey(segment));
    }

    private isSensitiveHeaderAttribute(key: string): boolean {
        const prefix = LoggerSentryHeaderKeyPrefixes.find(item =>
            key.startsWith(item)
        );
        if (!prefix) {
            return false;
        }

        const header = key.slice(prefix.length).split('.')[0]!;

        return this.isSensitiveKey(header.replaceAll('_', '-'));
    }

    private redactRecord(
        record: object,
        depth: number
    ): Record<string, unknown> {
        const entries: [string, unknown][] = [];
        for (const [key, item] of Object.entries(record)) {
            const isSensitive = this.isSensitiveKey(key);
            if (isSensitive) {
                entries.push([key, LoggerRedactedValue]);
                continue;
            }

            const value = this.redactValue(item, depth + 1);
            entries.push([key, value]);
        }

        return Object.fromEntries(entries);
    }

    private redactValue(value: unknown, depth: number): unknown {
        if (!value || typeof value !== 'object') {
            return value;
        }

        if (depth >= LoggerSentryRedactMaxDepth) {
            return LoggerRedactedValue;
        }

        if (Array.isArray(value)) {
            return value.map(item => this.redactValue(item, depth + 1));
        }

        return this.redactRecord(value, depth);
    }

    private redactFormBody(body: string): string {
        const pairs: string[] = [];
        for (const [key, value] of new URLSearchParams(body)) {
            const isSensitive = this.isSensitiveFormKey(key);
            const encodedValue = isSensitive
                ? LoggerRedactedValue
                : encodeURIComponent(value);
            pairs.push(`${encodeURIComponent(key)}=${encodedValue}`);
        }

        return pairs.join('&');
    }

    private redactBody(data: unknown): unknown {
        if (typeof data !== 'string') {
            return this.redactValue(data, 0);
        }

        const body = data.trim();
        if (!body) {
            return data;
        }

        if (body.startsWith('{') || body.startsWith('[')) {
            try {
                const redacted = this.redactValue(JSON.parse(body), 0);

                return JSON.stringify(redacted);
            } catch {
                return LoggerRedactedValue;
            }
        }

        const isFormBody = body
            .split('&')
            .every(pair => LoggerUrlEncodedPairRegex.test(pair));
        if (isFormBody) {
            return this.redactFormBody(body);
        }

        return LoggerRedactedValue;
    }

    private scrubData(data: Record<string, unknown> | null): void {
        if (!data) {
            return;
        }

        for (const key of LoggerSentryUrlKeys) {
            const value = data[key];
            if (typeof value === 'string') {
                data[key] = this.maskUrl(value);
            }
        }

        for (const key of LoggerSentryQueryKeys) {
            delete data[key];
        }

        for (const key of LoggerSentryBodyKeys) {
            if (data[key] !== undefined) {
                data[key] = this.redactBody(data[key]);
            }
        }

        for (const key of Object.keys(data)) {
            const isSensitive = this.isSensitiveHeaderAttribute(key);
            if (isSensitive) {
                data[key] = LoggerRedactedValue;
            }
        }
    }

    private scrubRequest(request: RequestEventData | null): void {
        if (!request) {
            return;
        }

        if (request.url) {
            request.url = this.maskUrl(request.url);
        }

        delete request.query_string;

        const headers = request.headers ?? {};
        for (const key of Object.keys(headers)) {
            const isSensitive = this.isSensitiveKey(key);
            if (isSensitive) {
                headers[key] = LoggerRedactedValue;
            }
        }

        const cookies = request.cookies ?? {};
        for (const key of Object.keys(cookies)) {
            cookies[key] = LoggerRedactedValue;
        }

        if (request.data !== undefined) {
            request.data = this.redactBody(request.data);
        }
    }

    scrubEvent<T extends Event>(event: T): T {
        this.scrubRequest(event.request ?? null);
        if (event.transaction) {
            event.transaction = this.maskName(event.transaction);
        }
        this.scrubData(event.contexts?.trace?.data ?? null);

        for (const span of event.spans ?? []) {
            if (span.description) {
                span.description = this.maskName(span.description);
            }
            this.scrubData(span.data);
        }

        for (const breadcrumb of event.breadcrumbs ?? []) {
            this.scrubData(breadcrumb.data ?? null);
        }

        if (event.extra) {
            event.extra = this.redactRecord(event.extra, 0);
        }

        if (event.contexts) {
            for (const [name, context] of Object.entries(event.contexts)) {
                if (context) {
                    event.contexts[name] = this.redactRecord(context, 0);
                }
            }
        }

        return event;
    }

    scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
        this.scrubData(breadcrumb.data ?? null);

        return breadcrumb;
    }

    scrubLog(log: Log): Log {
        if (!log.attributes) {
            return log;
        }

        const attributes = this.redactRecord(log.attributes, 0);
        this.scrubData(attributes);
        log.attributes = attributes;

        return log;
    }
}
