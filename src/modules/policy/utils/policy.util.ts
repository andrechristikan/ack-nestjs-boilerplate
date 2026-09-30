import { subject } from '@casl/ability';
import type { ForcedSubject } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { EnumPolicySubject } from '@generated/prisma-client/client';

@Injectable()
export class PolicyUtil {
    toSubject<T extends object>(
        subjectType: EnumPolicySubject,
        record: T
    ): T & ForcedSubject<EnumPolicySubject> {
        return subject(subjectType, record);
    }
}
