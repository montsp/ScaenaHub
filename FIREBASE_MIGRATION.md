# Firebase Migration Guide

This document outlines the Firebase migration process for ScaenaHub, transitioning from Supabase to Firebase (Cloud Firestore + Realtime Database).

## Overview

ScaenaHub is migrating to a hybrid Firebase architecture:
- **Cloud Firestore**: Main database for structured data (users, channels, messages, files)
- **Realtime Database**: Real-time features (presence, typing indicators, notifications)
- **Firebase Authentication**: User authentication and authorization
- **Google Drive API**: File storage and management (existing system maintained)

## Quick Start

### 1. Install Dependencies
```bash
npm install firebase firebase-admin
npm install --save-dev @types/firebase
```

### 2. Firebase Project Setup
```bash
npm run setup:firebase
```
Follow the detailed instructions provided by the setup script.

### 3. Environment Configuration
Update your `.env` file with Firebase configuration:

```env
# Firebase Configuration
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### 4. Test Configuration
```bash
npm run build
npm run test:firebase
```

### 5. Start Development Server
```bash
npm run dev
```

## Architecture

### Authentication System

ScaenaHub uses **custom username/password authentication** instead of email-based authentication:

- **Custom Tokens**: Firebase Admin SDK creates custom tokens for username-based login
- **Anonymous Auth**: Firebase Authentication uses anonymous provider with custom claims
- **Username Storage**: User credentials are stored in Firestore with username as identifier
- **JWT Integration**: Custom tokens are integrated with existing JWT-based session management

### Database Structure

#### Cloud Firestore Collections
```
/users/{userId}
  - username, email, role, profile, settings
  - createdAt, updatedAt

/channels/{channelId}
  - name, description, type, permissions
  - createdBy, createdAt, updatedAt

/messages/{messageId}
  - channelId, userId, content, type
  - attachments, reactions, threadId
  - createdAt, editedAt

/files/{fileId}
  - channelId, uploadedBy, filename, size
  - contentType, downloadURL
  - uploadedAt
```

#### Realtime Database Structure
```json
{
  "presence": {
    "channelId": {
      "userId": {
        "online": true,
        "lastSeen": "timestamp"
      }
    }
  },
  "typing": {
    "channelId": {
      "userId": "timestamp"
    }
  },
  "notifications": {
    "userId": {
      "notificationId": {
        "type": "new_message",
        "data": {},
        "timestamp": "timestamp"
      }
    }
  }
}
```

## Development Tools

### Firebase Emulators
For local development, use Firebase emulators:

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Start emulators
npm run emulator:start

# Export emulator data
npm run emulator:export

# Import emulator data
npm run emulator:import
```

### Environment Variables for Emulators
```env
USE_FIREBASE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=localhost
FIRESTORE_EMULATOR_PORT=8080
REALTIME_EMULATOR_HOST=localhost
REALTIME_EMULATOR_PORT=9000
AUTH_EMULATOR_HOST=localhost
AUTH_EMULATOR_PORT=9099
```

## Security Rules

### Firestore Rules
Located in `firestore.rules`, these rules control access to Firestore data:
- Role-based access control
- Channel permissions
- User data protection

### Realtime Database Rules
Located in `database.rules.json`, these rules control access to real-time data:
- Presence information
- Typing indicators
- User notifications

### Storage Rules
Located in `storage.rules`, these rules control file access:
- File size limits (10MB)
- File type restrictions
- User-based access control

## Migration Process

The migration follows these phases:

1. **Environment Setup** ✅
   - Firebase SDK installation
   - Configuration files
   - Environment variables

2. **Service Implementation** (Next)
   - Firestore service layer
   - Realtime Database service layer
   - Authentication integration

3. **Data Migration** (Future)
   - Export from Supabase
   - Import to Firebase
   - Data validation

4. **Testing & Deployment** (Future)
   - Integration testing
   - Performance testing
   - Production deployment

## Available Scripts

```bash
# Firebase setup and testing
npm run setup:firebase      # Show setup instructions
npm run test:firebase       # Test Firebase configuration

# Firebase emulators
npm run emulator:start      # Start Firebase emulators
npm run emulator:export     # Export emulator data
npm run emulator:import     # Import emulator data

# Development
npm run dev                 # Start development server
npm run build              # Build the project
```

## Troubleshooting

### Common Issues

1. **Firebase configuration missing**
   - Run `npm run setup:firebase` for instructions
   - Ensure all environment variables are set

2. **Service account JSON invalid**
   - Verify JSON format in FIREBASE_SERVICE_ACCOUNT
   - Ensure no extra spaces or line breaks

3. **Emulator connection issues**
   - Check emulator ports are not in use
   - Verify USE_FIREBASE_EMULATOR=true in development

4. **Build errors**
   - Run `npm run build` to check TypeScript compilation
   - Check import statements and type definitions

### Getting Help

- Check the Firebase console for project status
- Review Firebase documentation: https://firebase.google.com/docs
- Run `npm run test:firebase` for configuration validation

## Next Steps

After completing the environment setup:

1. Implement Firestore service layer (Task 2.1)
2. Implement Realtime Database service layer (Task 2.2)
3. Create data migration scripts (Task 4.1-4.3)
4. Update authentication system (Task 5.1-5.2)

See `.kiro/specs/firebase-migration/tasks.md` for the complete implementation plan.