# Overview

This document covers the audit functionality, including activity logging and password history tracking.

This documentation explains the features and usage of:
- **Activity Module**: Located at `src/modules/activity`
- **Password History Module**: Located at `src/modules/password-history`

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Activity Module](#activity-module)
    - [Overview](#overview-1)
    - [How to Use](#how-to-use)
  - [Password History Module](#password-history-module)
    - [Overview](#overview-2)
    - [How to Use](#how-to-use-1)

## Activity Module

### Overview

The Activity module provides comprehensive user activity tracking throughout the application. It records actions performed by users with detailed information about what was done, when it occurred, and who initiated the action.

### How to Use

The Activity module is designed to be used across the application to track important user actions. There are two main methods for creating activities:

1. **User Activities**: Record actions initiated by the user themselves
   ```typescript
   this.activityService.createByUser(
     user,
     { description: 'Updated profile information' }
   );
   ```

2. **Admin Activities**: Record actions performed by admins on user accounts
   ```typescript
   this.activityService.createByAdmin(
     targetUser,
     { 
       by: adminUserId, 
       description: 'Reset user password' 
     }
   );
   ```


## Password History Module

### Overview

The Password History module tracks user password changes to enforce password policies such as preventing password reuse and monitoring password change frequency. This module is essential for maintaining security standards and compliance requirements.

Key features:
- Records password changes with timestamps
- Stores password hashes for comparison
- Differentiates between different types of password changes (`SIGN_UP`, `FORGOT`, `TEMPORARY`, `CHANGE`)
- Supports querying password history for policy enforcement
- Implements configurable password expiration periods

### How to Use

The Password History module provides two main methods for recording password changes:

1. **User Password History**: Record password changes initiated by the user themselves
   ```typescript
   passwordHistoryService.createByUser(
     user,
     { type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE }
   );
   ```

2. **Admin Password History**: Record password changes performed by admins
   ```typescript
   passwordHistoryService.createByAdmin(
     user,
     { 
       by: adminId, 
       type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY 
     }
   );
   ```
