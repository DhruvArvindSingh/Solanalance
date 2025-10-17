# SolanaLance Messaging Feature - Complete Architecture & Troubleshooting Guide

## 📊 System Architecture Overview

The messaging system is a **three-tier architecture**:

```
FRONTEND (React + Zustand)
    ↓ HTTP Requests
HTTP BACKEND (Express + Prisma/PostgreSQL)
    ↓ WebSocket + HTTP calls
SOCKET.IO SERVER (Real-time events)
    ↓ Stores/fetches data
FIREBASE FIRESTORE (Message storage)
```

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue #1: Room Naming Mismatch (BLOCKING)
**Frontend sends to**: `project:${projectId}`
**Socket server listens on**: `project-${projectId}`
**Result**: Messages never reach recipients

**Location**: 
- Frontend: `messagingStore.ts` line 250
- Socket server: `src/index.ts` line 104

**Fix**: Change all Socket.IO room names to use colon format consistently

### Issue #2: Socket Event Data Loss (BLOCKING)
The `handleNewMessage` function in `messagingStore.ts` has a critical bug:
```typescript
const projectId = state.selectedProjectId; // ❌ This is NULL if user has multiple conversations open!
```
This should be:
```typescript
const projectId = message.projectId; // ✅ Get it from the message itself
```

### Issue #3: JWT Payload Inconsistency (BLOCKING)
- JWT is created with: `{ userId, role }`
- Socket server tries to access: `decoded.id` (undefined!)
- Should be: `decoded.userId`

**Location**: Socket server line 92, 148

### Issue #4: Messages Not Synced to Database (HIGH PRIORITY)
- Messages stored in Firestore only
- NOT saved to Prisma/PostgreSQL database
- Database queries in HTTP backend return empty results

**Fix**: When message is sent via Socket.IO, save to database via HTTP call

### Issue #5: Sender Profile Fetch Failure (MEDIUM)
- HTTP backend at `http://localhost:3000/api/profile/${userId}` not found
- Socket server can't fetch profiles
- Messages show "Unknown User"

---

## 🔧 HOW MESSAGING SHOULD WORK

### 1. User Opens Widget → Loads Conversations
```
MessagingWidget mounts
  ↓
useMessagingStore.loadConversations() called
  ↓
GET /api/conversations (to HTTP backend)
  ↓
HTTP Backend queries database:
  - Find projects where user is recruiter OR freelancer
  - Include job.title, recruiter, freelancer data
  - Count unread messages
  ↓
Returns array of conversations to frontend
  ↓
Store in messagingStore.conversations[]
  ↓
Render ConversationList component
```

### 2. User Selects Conversation → Loads Messages
```
User clicks conversation
  ↓
selectConversation(projectId)
  ↓
loadMessages(projectId) called
  ↓
GET /api/conversations/:projectId/messages
  ↓
HTTP Backend queries Prisma:
  - SELECT * FROM messages WHERE projectId = ?
  - Include sender profile
  - ORDER BY createdAt ASC
  ↓
Returns message array
  ↓
Store in messagingStore.messages[projectId]
  ↓
Render ActiveChat with messages
  ↓
PATCH /api/conversations/:projectId/read
  ↓
Mark all messages as read in database
```

### 3. User Sends Message → Real-time Delivery
```
User types and clicks Send
  ↓
sendMessage(projectId, content) called
  ↓
IF socket.connected:
  socket.emit('send-message', {
    projectId,
    content,
    messageType: 'text'
  })
ELSE:
  POST /api/conversations/:projectId/messages (fallback)
  ↓
Socket Server receives 'send-message'
  ↓
Create message in Firestore
Create message in DATABASE via HTTP call back to backend
Fetch sender profile from HTTP backend
Create message object with all data
  ↓
io.to(`project:${projectId}`).emit('new-message', {
  id,
  sender_id,
  content,
  created_at,
  projectId, // ⚠️ MUST include this
  sender: { full_name, avatar_url }
})
  ↓
Broadcast to all users in project room
  ↓
Frontend receives 'new-message' event
handleNewMessage(message) called
Add to messagingStore.messages[projectId]
  ↓
Re-render with new message
```

---

## 📁 COMPONENT BREAKDOWN

### MessagingWidget.tsx (Main Container)
- **Responsibility**: UI state (collapsed/expanded, minimized)
- **Props**: None
- **State**: isCollapsed, isMinimized (local)
- **Hooks**: useMessagingStore, useAuth
- **Children**: MessagingButton OR MessagingPanel

### ConversationList.tsx (Left Sidebar)
- **Responsibility**: Display all conversations, search filtering
- **State**: Uses messagingStore
- **Features**: 
  - Search by name/project/content
  - Unread badge
  - Online indicator
  - Last message preview
  - Timestamp formatting

### ActiveChat.tsx (Right Panel)
- **Responsibility**: Display selected conversation's messages
- **State**: Uses messagingStore
- **Features**:
  - Auto-scroll to latest message
  - Typing indicators
  - Message input
  - Typing event emission

### MessageBubble.tsx (Individual Message)
- **Props**: message, isOwn, showAvatar
- **Features**: Avatar, timestamp, content styling

### MessagingInitializer.tsx (Lifecycle Manager)
- **Responsibility**: Initialize socket on mount, cleanup on unmount
- **Props**: None (uses context)
- **Returns**: null (not rendered)

---

## 🔌 SOCKET.IO EVENTS

### Frontend → Server (emit)
```typescript
// Join projects on connection
socket.emit('join-projects', ['projectId1', 'projectId2'])

// Send message
socket.emit('send-message', {
  projectId: string,
  content: string,
  messageType?: 'text' | 'file'
})

// Typing indicators
socket.emit('typing-start', { projectId })
socket.emit('typing-stop', { projectId })
```

### Server → Frontend (emit/broadcast)
```typescript
// New message in project room
io.to(`project:${projectId}`).emit('new-message', {
  id: string,
  sender_id: string,
  content: string,
  created_at: ISO string,
  projectId: string, // ⚠️ Must include
  sender: { full_name, avatar_url }
})

// Typing indicators
socket.to(`project:${projectId}`).emit('user-typing', {
  userId,
  projectId
})
socket.to(`project:${projectId}`).emit('user-stopped-typing', {
  userId,
  projectId
})

// User online status
socket.broadcast.emit('user:online', { userId, status: 'online'|'offline' })
```

---

## 🛠️ FIXES REQUIRED

### Fix 1: Standardize Room Names
**File**: socket-server/src/index.ts
**Change all**: `project-${projectId}` → `project:${projectId}`

### Fix 2: Fix JWT User ID Access
**File**: socket-server/src/index.ts (line 92, 148)
```typescript
// WRONG:
const senderId = socket.data.user.id
// CORRECT:
const senderId = socket.data.user.userId
```

### Fix 3: Fix Message Project ID in Store
**File**: frontend/src/stores/messagingStore.ts (line 288)
```typescript
// WRONG:
const projectId = state.selectedProjectId

// CORRECT:
const projectId = message.projectId || state.selectedProjectId
```

### Fix 4: Persist Messages to Database
**File**: socket-server/src/index.ts (line 156)
After saving to Firestore, make HTTP POST to:
```
POST http://localhost:3000/api/conversations/:projectId/messages
```

### Fix 5: Use MessagingInitializer
**File**: frontend/src/App.tsx
```typescript
import { MessagingInitializer } from '@/components/messaging/MessagingInitializer'

// In JSX:
<Routes>
  {/* routes */}
</Routes>
<MessagingInitializer />
<MessagingWidget />
```

---

## ✅ VERIFICATION CHECKLIST

After fixes, verify:
- [ ] Messages appear instantly in chat (not just after reload)
- [ ] Sender profile shows (not "Unknown User")
- [ ] Online indicator appears green for active users
- [ ] Typing indicator shows when other user types
- [ ] Unread badges update in real-time
- [ ] Search filters conversations correctly
- [ ] Messages persist after page reload
- [ ] Browser console has no WebSocket errors
