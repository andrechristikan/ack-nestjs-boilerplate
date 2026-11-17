import { Injectable } from '@nestjs/common';
import {
    LoggerRedactedValue,
    LoggerUrlStaticSegmentRegex,
} from '@common/logger/constants/logger.constant';

@Injectable()
export class LoggerUrlUtil {
    private matchesGlob(path: string, pattern: string): boolean {
        const segments = pattern.split('*');
        const head = segments[0]!;
        const tail = segments[segments.length - 1]!;
        if (
            path.length < head.length + tail.length ||
            !path.startsWith(head) ||
            !path.endsWith(tail)
        ) {
            return false;
        }

        const end = path.length - tail.length;
        let position = head.length;
        for (const segment of segments.slice(1, -1)) {
            const index = path.indexOf(segment, position);
            if (index === -1 || index + segment.length > end) {
                return false;
            }

            position = index + segment.length;
        }

        return true;
    }

    maskPath(path: string): string {
        return path
            .split('/')
            .map(segment =>
                !segment || LoggerUrlStaticSegmentRegex.test(segment)
                    ? segment
                    : LoggerRedactedValue
            )
            .join('/');
    }

    maskUrl(url: string): string {
        try {
            const parsed = new URL(url);
            const maskedPath = this.maskPath(parsed.pathname);

            return `${parsed.origin}${maskedPath}`;
        } catch {
            return this.maskPath(url.split('?')[0]!.split('#')[0]!);
        }
    }

    matchesPatterns(url: string, patterns: string[]): boolean {
        if (!url || !patterns.length) {
            return false;
        }

        let pathname: string;
        try {
            const urlObj = new URL(url);
            pathname = urlObj.pathname;
        } catch {
            pathname = url.split('?')[0]!.split('#')[0]!;
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

            if (!pattern.includes('*')) {
                return false;
            }

            if (normalizedPattern === '*') {
                return true;
            }

            if (normalizedPattern.endsWith('*')) {
                const basePattern = normalizedPattern.slice(0, -1);

                if (basePattern.endsWith('/')) {
                    return normalizedPath.startsWith(basePattern);
                }

                return (
                    normalizedPath === basePattern ||
                    normalizedPath.startsWith(`${basePattern}/`)
                );
            }

            return this.matchesGlob(normalizedPath, normalizedPattern);
        });
    }
}
