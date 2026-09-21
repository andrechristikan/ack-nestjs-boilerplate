import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import type {
    Breadcrumb,
    Event,
    Log,
    LogSeverityLevel,
    RequestEventData,
} from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import appConfigFunction from '@configs/app.config';
import loggerConfigFunction from '@configs/logger.config';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    LoggerExcludedRoutes,
    LoggerHttpMethodPrefixRegex,
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
import { QueueException } from '@queues/exceptions/queue.exception';

const appConfigs = appConfigFunction();
const loggerConfigs = loggerConfigFunction();

const sentryLogLevels: LogSeverityLevel[] =
    appConfigs.env === EnumAppEnvironment.production
        ? ['warn', 'error', 'fatal']
        : ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

const sensitiveFields = new Set(
    LoggerSensitiveFields.map(field => field.toLowerCase())
);

function isExcludedUrl(url: string | undefined, patterns: string[]): boolean {
    if (!url || !patterns.length) {
        return false;
    }

    let pathname: string;
    try {
        pathname = new URL(url).pathname;
    } catch {
        pathname = url.split('?')[0].split('#')[0];
    }

    const normalizedPath = pathname.toLowerCase();

    return patterns.some(pattern => {
        if (!pattern) {
            return false;
        }

        const normalizedPattern = pattern.toLowerCase();

        if (normalizedPath === normalizedPattern) {
            return true;
        }

        if (normalizedPattern.endsWith('*')) {
            const base = normalizedPattern.slice(0, -1);
            return base ? normalizedPath.startsWith(base) : true;
        }

        return false;
    });
}

function maskPath(path: string): string {
    return path
        .split('/')
        .map(segment =>
            !segment || LoggerUrlStaticSegmentRegex.test(segment)
                ? segment
                : LoggerRedactedValue
        )
        .join('/');
}

function maskUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${maskPath(parsed.pathname)}`;
    } catch {
        return maskPath(url.split('?')[0].split('#')[0]);
    }
}

function maskName(name: string | undefined): string | undefined {
    const separator = name?.indexOf(' ') ?? -1;
    if (!name || separator === -1) {
        return name;
    }

    const target = name.slice(separator + 1);
    if (!/^(?:\/|https?:\/\/)/.test(target)) {
        return name;
    }

    return `${name.slice(0, separator)} ${maskUrl(target)}`;
}

function isSensitiveKey(key: string): boolean {
    return sensitiveFields.has(key.toLowerCase());
}

function isSensitiveFormKey(key: string): boolean {
    return key.split(/[[\].]/).some(segment => isSensitiveKey(segment));
}

function isSensitiveHeaderAttribute(key: string): boolean {
    const prefix = LoggerSentryHeaderKeyPrefixes.find(item =>
        key.startsWith(item)
    );
    if (!prefix) {
        return false;
    }

    const header = key.slice(prefix.length).split('.')[0];
    return isSensitiveKey(header.replaceAll('_', '-'));
}

function redactRecord(record: object, depth: number): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(record).map(([key, item]) => [
            key,
            isSensitiveKey(key)
                ? LoggerRedactedValue
                : redactValue(item, depth + 1),
        ])
    );
}

function redactValue(value: unknown, depth: number): unknown {
    if (!value || typeof value !== 'object') {
        return value;
    }

    if (depth >= LoggerSentryRedactMaxDepth) {
        return LoggerRedactedValue;
    }

    if (Array.isArray(value)) {
        return value.map(item => redactValue(item, depth + 1));
    }

    return redactRecord(value, depth);
}

function redactFormBody(body: string): string {
    return [...new URLSearchParams(body)]
        .map(
            ([key, value]) =>
                `${encodeURIComponent(key)}=${
                    isSensitiveFormKey(key)
                        ? LoggerRedactedValue
                        : encodeURIComponent(value)
                }`
        )
        .join('&');
}

function redactBody(data: unknown): unknown {
    if (typeof data !== 'string') {
        return redactValue(data, 0);
    }

    const body = data.trim();
    if (!body) {
        return data;
    }

    if (body.startsWith('{') || body.startsWith('[')) {
        try {
            return JSON.stringify(redactValue(JSON.parse(body), 0));
        } catch {
            return LoggerRedactedValue;
        }
    }

    if (body.split('&').every(pair => LoggerUrlEncodedPairRegex.test(pair))) {
        return redactFormBody(body);
    }

    return LoggerRedactedValue;
}

function scrubData(data: Record<string, unknown> | undefined): void {
    if (!data) {
        return;
    }

    for (const key of LoggerSentryUrlKeys) {
        const value = data[key];
        if (typeof value === 'string') {
            data[key] = maskUrl(value);
        }
    }

    for (const key of LoggerSentryQueryKeys) {
        delete data[key];
    }

    for (const key of LoggerSentryBodyKeys) {
        if (data[key] !== undefined) {
            data[key] = redactBody(data[key]);
        }
    }

    for (const key of Object.keys(data)) {
        if (isSensitiveHeaderAttribute(key)) {
            data[key] = LoggerRedactedValue;
        }
    }
}

function scrubRequest(request: RequestEventData | undefined): void {
    if (!request) {
        return;
    }

    if (request.url) {
        request.url = maskUrl(request.url);
    }

    delete request.query_string;

    const headers = request.headers ?? {};
    for (const key of Object.keys(headers)) {
        if (isSensitiveKey(key)) {
            headers[key] = LoggerRedactedValue;
        }
    }

    const cookies = request.cookies ?? {};
    for (const key of Object.keys(cookies)) {
        cookies[key] = LoggerRedactedValue;
    }

    if (request.data !== undefined) {
        request.data = redactBody(request.data);
    }
}

function scrubEvent<T extends Event>(event: T): T {
    scrubRequest(event.request);
    event.transaction = maskName(event.transaction);
    scrubData(event.contexts?.trace?.data);

    for (const span of event.spans ?? []) {
        span.description = maskName(span.description);
        scrubData(span.data);
    }

    for (const breadcrumb of event.breadcrumbs ?? []) {
        scrubData(breadcrumb.data);
    }

    return event;
}

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
    scrubData(breadcrumb.data);

    return breadcrumb;
}

function scrubLog(log: Log): Log {
    if (!log.attributes) {
        return log;
    }

    const attributes = redactRecord(log.attributes, 0);
    scrubData(attributes);
    log.attributes = attributes;

    return log;
}

if (loggerConfigs.sentry.dsn) {
    Sentry.init({
        dsn: loggerConfigs.sentry.dsn,
        debug: false,
        environment: appConfigs.env,
        release: appConfigs.version,
        enableLogs: true,
        integrations: [
            nodeProfilingIntegration(),
            Sentry.pinoIntegration({ log: { levels: sentryLogLevels } }),
        ],
        tracesSampleRate:
            appConfigs.env === EnumAppEnvironment.production ? 0.3 : 1.0,
        profilesSampleRate:
            appConfigs.env === EnumAppEnvironment.production ? 0.1 : 0.5,
        normalizeDepth: 3,
        maxValueLength: 1000,
        attachStacktrace: true,
        sendDefaultPii: false,
        maxBreadcrumbs: 30,
        beforeSend(event, hint) {
            const originalException = hint?.originalException;
            if (
                originalException instanceof QueueException &&
                !originalException.isFatal
            ) {
                return null;
            }

            if (event.request) {
                const url = event.request.url;

                if (isExcludedUrl(url, LoggerExcludedRoutes)) {
                    return null;
                }
            }

            if (event.request && event.contexts && event.contexts.response) {
                const statusCode = event.contexts.response.status_code;
                if (statusCode && statusCode < 500) {
                    return null;
                }
            }

            if (event.level === 'info' || event.level === 'debug') {
                return null;
            }

            if (appConfigs.env !== EnumAppEnvironment.production && hint) {
                event.extra = {
                    ...event.extra,
                    originalException: hint.originalException,
                };
            }

            return scrubEvent(event);
        },
        beforeSendTransaction(event) {
            return scrubEvent(event);
        },
        beforeBreadcrumb(breadcrumb) {
            return scrubBreadcrumb(breadcrumb);
        },
        beforeSendLog(log) {
            return scrubLog(log);
        },
        tracesSampler: samplingContext => {
            if (
                isExcludedUrl(
                    samplingContext.normalizedRequest?.url,
                    LoggerExcludedRoutes
                ) ||
                isExcludedUrl(
                    samplingContext.name.replace(
                        LoggerHttpMethodPrefixRegex,
                        ''
                    ),
                    LoggerExcludedRoutes
                )
            ) {
                return 0;
            }

            return appConfigs.env === EnumAppEnvironment.production ? 0.3 : 1.0;
        },
    });
}
