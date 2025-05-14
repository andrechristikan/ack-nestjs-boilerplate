# Overview

This document explains the background processing system in ACK NestJS Boilerplate, which uses BullMQ for job queuing and processing, particularly for SMS and email sending.

This documentation explains the features and usage of:
- **Worker Module**: Located at `src/worker/worker.module.ts`
- **SMS Module**: Located at `src/modules/sms`
- **Email Module**: Located at `src/modules/email`
- **Session Module**: Located at `src/modules/session`

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [BullMQ](#bullmq)
    - [Configuration](#configuration)
    - [Queue Management](#queue-management)
  - [Modules](#modules)
    - [SMS Module](#sms-module)
      - [Add Queue Jobs](#add-queue-jobs)
      - [SMS Processors](#sms-processors)
      - [SMS Templates](#sms-templates)
    - [Email Module](#email-module)
      - [Add Queue Jobs](#add-queue-jobs-1)
      - [Email Processors](#email-processors)
      - [Email Templates](#email-templates)

## BullMQ

BullMQ is a Redis-based queue system that allows for reliable background job processing in Node.js applications. The boilerplate integrates BullMQ to handle resource-intensive or time-consuming tasks such as sending emails and SMS messages.

### Configuration

The BullMQ configuration is defined in the `CommonModule` through the `BullModule.forRootAsync()` method. This establishes the Redis connection and default job options for all queues.

```typescript
// /Users/ack/Development/repos/ack-nestjs-boilerplate/src/common/common.module.ts

@Module({
    // ...existing code...
    imports: [
        // ...existing code...
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('redis.queue.host'),
                    port: configService.get<number>('redis.queue.port'),
                    username: configService.get<string>('redis.queue.username'),
                    password: configService.get<string>('redis.queue.password'),
                    tls: configService.get<any>('redis.queue.tls'),
                },
                defaultJobOptions: {
                    backoff: {
                        type: 'exponential',
                        delay: 3000,
                    },
                    attempts: 3,
                },
            }),
        }),
        // ...existing code...
    ],
})
export class CommonModule {}
```

Required environment variables are defined in the `.env` file:

```dotenv
# Redis Queue Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_TLS_ENABLE=false
```

### Queue Management

In the boilerplate, the queue registration is primarily done in the route modules rather than in individual service modules. This centralized approach simplifies queue management and ensures consistent configuration.

```typescript
// Example from routes.user.module.ts
@Module({
    imports: [
        // ...other imports
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.SMS_QUEUE,
        }),
    ],
})
export class RoutesUserModule {}
```

Similarly, processors are registered in the `WorkerModule`:

```typescript
// src/worker/worker.module.ts
@Module({
    imports: [EmailModule, SessionModule, SmsModule],
    providers: [EmailProcessor, SessionProcessor, SmsProcessor],
})
export class WorkerModule {}
```

Queue names are defined as enums to maintain consistency:

```typescript
export enum ENUM_WORKER_QUEUES {
    EMAIL_QUEUE = 'EMAIL_QUEUE',
    SMS_QUEUE = 'SMS_QUEUE',
    SESSION_QUEUE = 'SESSION_QUEUE',
}
```

## Modules

### SMS Module

The SMS module handles queuing and processing of SMS messages, using AWS Pinpoint as the SMS provider.

#### Add Queue Jobs

To add SMS jobs to the queue, you need to inject the BullMQ Queue into your service or controller using the `@InjectQueue` decorator from `@nestjs/bullmq`. Note that the SMS queue is registered in the route modules, not in the SMS module itself, as explained in the Queue Management section.

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENUM_WORKER_QUEUES, ENUM_WORKER_PRIORITY } from 'src/worker/enums/worker.enum';
import { ENUM_SEND_SMS_PROCESS } from 'src/modules/sms/enums/sms.enum';
import { SmsSendRequestDto } from 'src/modules/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from 'src/modules/sms/dtos/request/sms.verification.request.dto';

@Injectable()
export class YourService {
    constructor(
        @InjectQueue(ENUM_WORKER_QUEUES.SMS_QUEUE)
        private readonly smsQueue: Queue
    ) {}

    async sendOtpVerification(userId: string, mobileNumber: string): Promise<void> {
        // Add job to SMS queue
        await this.smsQueue.add(
            ENUM_SEND_SMS_PROCESS.VERIFICATION,
            {
                send,
                data,
            },
            {
                priority: ENUM_WORKER_PRIORITY.HIGH,
            }
        );
    }
}
```

The job options typically include:

- `priority`: Determines the processing order (HIGH, MEDIUM, LOW)
- `attempts`: Number of retry attempts (defaults to 3 as configured in the global settings)
- `backoff`: Retry strategy (defaults to exponential with 3-second delay as configured in the global settings)

In the current implementation, the SMS processor is registered in the `WorkerModule` rather than directly in the SMS module:

```typescript
// src/worker/worker.module.ts
@Module({
    imports: [EmailModule, SessionModule, SmsModule],
    providers: [EmailProcessor, SessionProcessor, SmsProcessor],
})
export class WorkerModule {}
```

This architecture allows for a clean separation between the SMS service functionality and the queue processing logic.

#### SMS Processors

The `SmsProcessor` class handles SMS jobs from the queue by extending the `WorkerHost` class:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ENUM_SEND_SMS_PROCESS } from 'src/modules/sms/enums/sms.enum';
import { SmsSendRequestDto } from 'src/modules/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from 'src/modules/sms/dtos/request/sms.verification.request.dto';
import { ISmsProcessor } from 'src/modules/sms/interfaces/sms.processor.interface';
import { SmsService } from 'src/modules/sms/services/sms.service';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Processor({
    name: ENUM_WORKER_QUEUES.SMS_QUEUE,
})
export class SmsProcessor extends WorkerHost implements ISmsProcessor {
    constructor(private readonly smsService: SmsService) {
        super();
    }

    async process(job: Job<any>): Promise<any> {
        try {
            switch (job.name) {
                case ENUM_SEND_SMS_PROCESS.VERIFICATION:
                    await this.processOtpVerificationSms(
                        job.data.send,
                        job.data.data as SmsVerificationRequestDto
                    );
                    return;
                default:
                    return;
            }
        } catch (error: unknown) {
            throw error;
        }
    }

    async processOtpVerificationSms(
        send: SmsSendRequestDto,
        data: SmsVerificationRequestDto
    ): Promise<void> {
        await this.smsService.sendVerification(send, data);
    }
}
```

#### SMS Templates

SMS templates are defined as text files located in the `/src/modules/sms/templates/` directory. These are simple text files with placeholders that are replaced with actual values when sending an SMS:

```txt
Hi {name}, Here is your OTP {otp} for verification. The OTP is valid until {expiredAt}. By: {homeName}.
```

The SMS service replaces the placeholders in the template with actual values:

```typescript
async sendVerification(
    { name, mobileNumber }: SmsSendRequestDto,
    { expiredAt, otp }: SmsVerificationRequestDto
): Promise<void> {
    const message = this.messageVerification
        .replace('{name}', name)
        .replace('{otp}', otp)
        .replace(
            '{expiredAt}',
            this.helperDateService.formatToRFC2822(expiredAt)
        )
        .replace('{homeName}', this.homeName);

    return this.awsPinPointService.sendSMS(mobileNumber, message);
}
```

This approach allows for simple templating while maintaining flexibility for different types of SMS messages.

### Email Module

The Email Module handles queuing and processing of email messages, providing a reliable asynchronous way to send emails throughout the application.

#### Add Queue Jobs

To add email jobs to the queue, inject the BullMQ Queue into your service or controller using the `@InjectQueue` decorator. As described in the Queue Management section, the email queue is registered in the route modules, not in the Email module itself.

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENUM_WORKER_QUEUES, ENUM_WORKER_PRIORITY } from 'src/worker/enums/worker.enum';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailVerificationDto } from 'src/modules/email/dtos/email.verification.dto';

@Injectable()
export class YourService {
    constructor(
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue
    ) {}

    async someFunction(email: string, name: string): Promise<void> {
        // Add job to email queue
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send,
                data,
            },
            {
                priority: ENUM_WORKER_PRIORITY.HIGH,
            }
        );
    }
}
```

The job options follow the same pattern as described in the SMS Module section.

#### Email Processors

The `EmailProcessor` class handles email jobs from the queue:

```typescript
@Processor(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
    constructor(
        private readonly emailService: EmailService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    async process(job: Job<EmailWorkerDto, any, string>): Promise<void> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case ENUM_SEND_EMAIL_PROCESS.VERIFICATION:
                    await this.processVerification(
                        job.data.send,
                        job.data.data as EmailVerificationDto
                    );
                    break;
                // Other email process cases...
                default:
                    break;
            }
        } catch (error: any) {
            // Error handling logic
        }
        
        return;
    }

    async processVerification(
        data: EmailSendDto, 
        verificationData: EmailVerificationDto
    ): Promise<boolean> {
        return this.emailService.sendVerification(data, verificationData);
    }
}
```

#### Email Templates

The Email module uses AWS SES (Simple Email Service) templates for sending emails. These templates are Handlebars (HBS) files stored in the project's `src/templates/` directory with the `.template.hbs` extension.

Templates are first imported into AWS SES before they can be used:

```typescript
async importVerification(): Promise<boolean> {
    try {
        const templatePath = join(
            process.cwd(),
            'src/templates/email-verification.template.hbs'
        );

        await this.awsSESService.createTemplate({
            name: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            subject: `Email Verification`,
            htmlBody: readFileSync(templatePath, 'utf8'),
        });

        return true;
    } catch (err: unknown) {
        this.logger.error(err);
        return false;
    }
}
```

When sending an email, the template is referenced by name and data is provided to populate the template variables:

```typescript
async sendVerification(
    { name, email }: EmailSendDto,
    { expiredAt, reference, otp }: EmailVerificationDto
): Promise<boolean> {
    try {
        await this.awsSESService.send({
            templateName: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            recipients: [email],
            sender: this.fromEmail,
            templateData: {
                homeName: this.homeName,
                name: title(name),
                supportEmail: this.supportEmail,
                homeUrl: this.homeUrl,
                expiredAt: this.helperDateService.formatToIsoDate(expiredAt),
                otp,
                reference,
            },
        });

        return true;
    } catch (err: unknown) {
        this.logger.error(err);
        return false;
    }
}
```

The boilerplate includes several predefined email templates:

1. **Verification Email** - Sent to verify a user's email address with an OTP code
2. **Email Verified** - Confirmation that email verification was successful
3. **Mobile Number Verified** - Confirmation that mobile number verification was successful
4. **Reset Password** - Includes a link to reset the user's password
5. **Temporary Password** - Provides a temporary password when a user's account is created by an admin
6. **Welcome Email** - Sent when a user first signs up
7. **Change Password** - Confirmation that a password has been changed

Email templates can be managed through the service with methods to:
- Import a template to AWS SES
- Delete a template from AWS SES
- Send an email using a template

This approach leverages AWS SES's template capabilities for reliable email delivery with consistent formatting and content.

