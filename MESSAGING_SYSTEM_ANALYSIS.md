# Messaging System Architecture Analysis

## Overview

The SolanaLance platform implements a **hybrid messaging system** that combines real-time WebSocket communication (Socket.IO) with REST API fallbacks. The system is split across three main components:

1. **Frontend** - React-based UI with Zustand state management
2. **Socket Server** - Real-time messaging via Socket.IO + Firebase Firestore
3. **HTTP Backend** - REST API with PostgreSQL/Prisma

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ MessagingWidget  │  │ ConversationList │  │  ActiveChat   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┴─────────────────────┘         │
│                                 │                               │
│                     ┌───────────▼───────────┐                   │
│                     │  messagingStore.ts    │                   │
│                     │  (Zustand State)      │                   │
│                     └───────────┬───────────┘                   │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
         ┌──────────▼──────┐      │      ┌──────▼──────────┐
         │  Socket.IO      │      │      │  REST API       │
         │  Connection     │      │      │  (/api/...)     │
         └──────────┬──────┘      │      └──────┬──────────┘
                    │             │             │
┌───────────────────▼─────────────▼─────────────▼───────────────┐
│                     BACKEND SERVICES                           │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐│
│  │   SOCKET SERVER (Port 3001)  │  │ HTTP BACKEND (Port 3000)││
│  │   ─────────────────────────  │  │ ─────────────────────── ││
│  │   • Real-time messaging      │  │ • Conversations API     ││
│  │   • Typing indicators        │  │ • Message persistence   ││
│  │   • Online status            │  │ • Notifications         ││
│  │   • Room management          │  │ • User authentication   ││
│  │                              │  │                         ││
│  │   Storage: Firebase/Firestore│  │ Storage: PostgreSQL     ││
│  └──────────────────────────────┘  └─────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend Components

#### **MessagingWidget** (`frontend/src/components/messaging/MessagingWidget.tsx`)

**Purpose:** Main messaging container that appears as a floating widget

**Key Features:**
- Toggle expand/collapse state
- Unread message badge
- Search functionality
- Socket initialization on mount
- Split-view layout (conversations + active chat)

**State Management:**
```typescript
const {
    isCollapsed,
    selectedProjectId,
    searchQuery,
    unreadTotal,
    conversations,
    toggleCollapse,
    setSearchQuery,
    loadConversations,
    initializeSocket,
    disconnectSocket
} = useMessagingStore();
```

**Lifecycle:**
```javascript
useEffect(() => {
    if (user) {
        const token = localStorage.getItem('token');
        if (token) {
            initializeSocket(user.id, token);
            loadConversations();
        }
    }
    return () => disconnectSocket();
}, [user]);
```

---

#### **ConversationList** (`frontend/src/components/messaging/ConversationList.tsx`)

**Purpose:** Display list of all active conversations

**Features:**
- Search filtering
- Unread message count badges
- Online status indicators
- Last message preview
- Timestamp ("2 minutes ago")
- Empty state handling

**Data Structure:**
```typescript
interface ConversationSummary {
    projectId: string;
    jobTitle: string;
    otherUser: {
        id: string;
        name: string;
        avatar: string | null;
        isOnline: boolean;
    };
    lastMessage: {
        content: string;
        timestamp: Date;
        isRead: boolean;
        senderId: string;
    } | null;
    unreadCount: number;
}
```

---

#### **ActiveChat** (`frontend/src/components/messaging/ActiveChat.tsx`)

**Purpose:** Display selected conversation and allow sending messages

**Features:**
- Message history (auto-scrolling)
- Message input with send button
- Typing indicators
- Loading states
- Message sending via Socket.IO or REST API fallback

**Message Sending:**
```typescript
const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProjectId) return;

    setIsSending(true);
    try {
        await sendMessage(
            selectedProjectId, 
            newMessage, 
            activeConversation?.otherUser.id
        );
        setNewMessage('');
    } catch (error) {
        toast.error('Failed to send message');
    } finally {
        setIsSending(false);
    }
};
```

---

#### **MessageBubble** (`frontend/src/components/messaging/MessageBubble.tsx`)

**Purpose:** Individual message display component

**Features:**
- Different styling for own vs others' messages
- Avatar display
- Timestamp
- Sender name
- Responsive layout

**Visual Design:**
- Own messages: Primary gradient background, right-aligned
- Others' messages: Muted background, left-aligned
- Rounded corners with chat bubble style

---

### 2. State Management

#### **messagingStore.ts** (`frontend/src/stores/messagingStore.ts`)

**Purpose:** Centralized Zustand store for all messaging state

**State Structure:**
```typescript
interface MessagingState {
    // UI State
    isCollapsed: boolean;
    selectedProjectId: string | null;
    searchQuery: string;

    // Data
    conversations: ConversationSummary[];
    messages: Record<string, Message[]>;  // projectId -> messages[]
    unreadCounts: Record<string, number>;
    typingUsers: Record<string, string[]>;
    onlineUsers: Set<string>;

    // Socket
    socket: Socket | null;

    // Computed
    unreadTotal: number;

    // Actions
    toggleCollapse: () => void;
    setSearchQuery: (query: string) => void;
    selectConversation: (projectId: string) => void;
    loadConversations: () => Promise<void>;
    loadMessages: (projectId: string) => Promise<void>;
    sendMessage: (projectId: string, content: string, recipientId?: string) => Promise<void>;
    markAsRead: (projectId: string) => Promise<void>;
    initializeSocket: (userId: string, token: string) => void;
    disconnectSocket: () => void;
    handleNewMessage: (message: Message) => void;
    handleTyping: (projectId: string, userId: string, isTyping: boolean) => void;
    handleUserOnline: (userId: string, isOnline: boolean) => void;
}
```

**Key Functions:**

1. **`loadConversations()`**
   - Fetches all conversations from `/api/conversations`
   - Transforms data to `ConversationSummary[]`
   - Calculates total unread count

2. **`loadMessages(projectId)`**
   - Fetches messages for a specific project from `/api/conversations/:projectId/messages`
   - Stores in `messages[projectId]`

3. **`sendMessage(projectId, content, recipientId?)`**
   - Primary: Sends via Socket.IO (`send-message` event)
   - Fallback: Uses REST API if socket not connected
   - Auto-reloads messages after REST API send

4. **`markAsRead(projectId)`**
   - Calls `/api/conversations/:projectId/read`
   - Updates local unread counts
   - Recalculates total unread

5. **`initializeSocket(userId, token)`**
   - Connects to Socket.IO server with JWT auth
   - Sets up event listeners:
     - `connect` → Join project rooms
     - `new-message` → Handle incoming messages
     - `user-typing` → Show typing indicators
     - `user-stopped-typing` → Hide typing indicators
     - `user:online` → Update online status
     - `error` → Log errors

6. **`handleNewMessage(message)`**
   - Adds message to local state
   - Updates conversation's last message
   - Increments unread count (if not from self and not in active chat)
   - Triggers conversation list refresh if needed

---

### 3. Socket Server

#### **socket-server/src/index.ts**

**Purpose:** Real-time messaging server using Socket.IO + Firebase Firestore

**Technology Stack:**
- Express.js server
- Socket.IO for WebSocket connections
- Firebase Admin SDK + Firestore for message storage
- JWT authentication

**Port:** 3001 (configurable via `SOCKET_PORT`)

**Key Features:**

1. **Authentication Middleware**
```typescript
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.user = decoded;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});
```

2. **Socket Events Handled:**

| Event | Description | Handler |
|-------|-------------|---------|
| `join-project` | User joins a project room | Adds socket to `project-{projectId}` room |
| `leave-project` | User leaves a project room | Removes from room |
| `send-message` | Send a message | Saves to Firestore, broadcasts to room |
| `mark-messages-read` | Mark messages as read | Updates Firestore `readBy` array |
| `typing-start` | User starts typing | Broadcasts to room |
| `typing-stop` | User stops typing | Broadcasts to room |
| `disconnect` | User disconnects | Cleanup user tracking |

3. **Message Storage Flow:**

```javascript
socket.on('send-message', async (data) => {
    const { projectId, content, messageType, recipientId } = data;
    
    // 1. Create message in Firestore
    const messageData = {
        id: uuidv4(),
        projectId,
        senderId: userId,
        content,
        messageType,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        readBy: [userId]
    };
    
    const messageRef = await db.collection('messages').add(messageData);
    
    // 2. Fetch sender profile from HTTP backend
    const response = await fetch(`http://localhost:3000/api/profile/${userId}`);
    const senderProfile = await response.json();
    
    // 3. Broadcast to room
    const message = {
        id: messageRef.id,
        projectId,
        sender_id: userId,
        content,
        created_at: new Date().toISOString(),
        sender: senderProfile
    };
    
    socket.to(`project-${projectId}`).emit('new-message', message);
    
    // 4. Create notification
    if (recipientId) {
        await db.collection('notifications').add({
            userId: recipientId,
            title: 'New Message',
            message: 'You have received a new message',
            type: 'message',
            relatedId: projectId
        });
    }
});
```

4. **REST API Endpoints (Fallback):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/messages/project/:projectId` | GET | Fetch messages for a project |
| `/api/messages` | POST | Send a message via REST |
| `/api/notifications/:userId` | GET | Get user notifications |
| `/api/notifications/:notificationId/read` | PUT | Mark notification as read |
| `/health` | GET | Health check |

---

### 4. HTTP Backend

#### **http-backend/src/routes/conversations.ts**

**Purpose:** REST API for conversation management

**Endpoints:**

##### **GET `/api/conversations`**
```typescript
// Get all conversations for current user
// Returns: Array of conversations with last message and unread count
```

**Response:**
```json
[
  {
    "id": "project-uuid",
    "job": { "title": "Build React App" },
    "otherUser": {
      "id": "user-uuid",
      "full_name": "John Doe",
      "avatar_url": "https://..."
    },
    "lastMessage": {
      "content": "Hi there!",
      "created_at": "2025-10-29T10:00:00Z",
      "isRead": false,
      "sender_id": "user-uuid"
    },
    "unreadCount": 3
  }
]
```

**Implementation:**
- Queries `projects` table where user is recruiter OR freelancer
- Includes last message via Prisma relationship
- Calculates unread count via `_count` aggregate
- Orders by message count DESC, then created date

##### **GET `/api/conversations/:projectId/messages`**
```typescript
// Get all messages for a specific project
// Supports pagination via query params: ?page=1&limit=50
```

**Response:**
```json
[
  {
    "id": "message-uuid",
    "sender_id": "user-uuid",
    "content": "Hello!",
    "created_at": "2025-10-29T10:00:00Z",
    "sender": {
      "full_name": "Jane Smith",
      "avatar_url": "https://..."
    },
    "messageType": "text",
    "isRead": true
  }
]
```

**Authorization:**
- Verifies user is part of the project (recruiter or freelancer)
- Returns 403 if unauthorized

##### **POST `/api/conversations/:projectId/messages`**
```typescript
// Send a new message
// Body: { content: string, messageType?: string }
```

**Process:**
1. Validates user access to project
2. Creates message in database (Prisma)
3. Creates notification for recipient
4. Returns created message

**Response:**
```json
{
  "id": "message-uuid",
  "sender_id": "user-uuid",
  "content": "Hello!",
  "created_at": "2025-10-29T10:00:00Z",
  "sender": {
    "full_name": "Current User",
    "avatar_url": "https://..."
  },
  "messageType": "text",
  "isRead": false
}
```

##### **PATCH `/api/conversations/:projectId/read`**
```typescript
// Mark all messages in project as read
// Only marks messages NOT sent by current user
```

**Implementation:**
```typescript
await req.prisma.message.updateMany({
    where: {
        projectId,
        senderId: { not: userId },
        isRead: false
    },
    data: { isRead: true }
});
```

---

#### **http-backend/src/routes/messages.ts**

**Purpose:** Alternative REST API for messages (legacy/redundant?)

**Endpoints:**

##### **GET `/api/messages/project/:projectId`**
- Similar to conversations endpoint
- Includes automatic mark-as-read functionality
- Supports limit/offset pagination

##### **POST `/api/messages`**
- Send message with file support
- Body includes: `projectId`, `content`, `messageType`, `fileUrl`, `fileName`, `fileSize`
- Creates notification for recipient

---

## Data Flow Examples

### Example 1: User Sends a Message

```mermaid
sequenceDiagram
    participant User
    participant ActiveChat
    participant Store
    participant Socket
    participant SocketServer
    participant Firestore
    participant HTTPBackend
    participant Recipient

    User->>ActiveChat: Types message & clicks send
    ActiveChat->>Store: sendMessage(projectId, content)
    Store->>Socket: emit('send-message', data)
    Socket->>SocketServer: WebSocket message
    SocketServer->>Firestore: Save message
    SocketServer->>HTTPBackend: Fetch sender profile
    HTTPBackend-->>SocketServer: Return profile data
    SocketServer->>Firestore: Save notification
    SocketServer->>Recipient: emit('new-message', message)
    SocketServer->>User: emit('message-sent', message)
    Recipient->>Store: handleNewMessage(message)
    Store->>Store: Update conversations & messages
```

### Example 2: Loading Conversations

```mermaid
sequenceDiagram
    participant Widget
    participant Store
    participant HTTPBackend
    participant Database

    Widget->>Store: loadConversations()
    Store->>HTTPBackend: GET /api/conversations
    HTTPBackend->>Database: Query projects + messages
    Database-->>HTTPBackend: Return data
    HTTPBackend-->>Store: Return conversations[]
    Store->>Store: Transform & set state
    Store->>Widget: Re-render with conversations
```

### Example 3: User Opens a Conversation

```mermaid
sequenceDiagram
    participant User
    participant ConvList
    participant Store
    participant HTTPBackend
    participant ActiveChat

    User->>ConvList: Click conversation
    ConvList->>Store: selectConversation(projectId)
    Store->>Store: Set selectedProjectId
    Store->>HTTPBackend: GET /api/conversations/:id/messages
    HTTPBackend-->>Store: Return messages[]
    Store->>Store: Set messages[projectId]
    Store->>HTTPBackend: PATCH /api/conversations/:id/read
    HTTPBackend-->>Store: Mark as read success
    Store->>Store: Update unreadCounts
    Store->>ActiveChat: Re-render with messages
```

---

## Database Schema

### PostgreSQL (HTTP Backend - Prisma)

#### **messages** table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (sender_id) REFERENCES profiles(id)
);

CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### Firestore (Socket Server)

#### **messages** collection
```json
{
  "id": "uuid",
  "projectId": "project-uuid",
  "senderId": "user-uuid",
  "content": "Message text",
  "messageType": "text",
  "recipientId": "user-uuid",
  "createdAt": "Timestamp",
  "readBy": ["user-uuid-1", "user-uuid-2"]
}
```

#### **notifications** collection
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "title": "New Message",
  "message": "You have received a new message",
  "type": "message",
  "relatedId": "project-uuid",
  "read": false,
  "createdAt": "Timestamp"
}
```

---

## Key Features

### 1. Real-time Communication
- Socket.IO for instant message delivery
- Typing indicators
- Online status tracking
- Room-based messaging (per project)

### 2. Offline Support
- REST API fallback when socket disconnected
- Message queue in Firestore
- Automatic reconnection

### 3. Notifications
- In-app notifications via Socket.IO
- Database-persisted notifications
- Notification creation on message send

### 4. Read Receipts
- `isRead` flag in database
- `readBy` array in Firestore
- Automatic mark-as-read when viewing conversation

### 5. Search & Filtering
- Client-side search in conversation list
- Filter by user name, job title, or message content

### 6. User Presence
- Online/offline status tracking
- Visual indicators in UI
- Stored in `activeUsers` Map on socket server

---

## Environment Variables

### Socket Server
```env
PORT=3001
SOCKET_PORT=3001
JWT_SECRET=your-jwt-secret

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/...
```

### Frontend
```env
VITE_SOCKET_URL=http://localhost:3001
```

### HTTP Backend
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
```

---

## Issues & Recommendations

### Current Issues

1. **Dual Storage System**
   - Messages stored in BOTH PostgreSQL and Firestore
   - Potential for data inconsistency
   - Complexity in maintaining two databases

2. **Duplicate API Routes**
   - `http-backend/src/routes/messages.ts` 
   - `http-backend/src/routes/conversations.ts`
   - Both provide similar functionality

3. **Profile Fetching in Socket Server**
   - Socket server makes HTTP calls to backend for profiles
   - Tight coupling between services
   - Network overhead for each message

4. **No Message Pagination in Socket Events**
   - All messages loaded at once
   - Could be slow for long conversations

5. **Missing Features**
   - No message editing
   - No message deletion
   - No file uploads in real-time
   - No group conversations
   - No message reactions

### Recommendations

#### Short-term Improvements

1. **Consolidate Message Storage**
   - Choose ONE database (preferably PostgreSQL)
   - Remove Firestore dependency OR use it only for real-time sync
   - Use PostgreSQL as source of truth

2. **Merge Duplicate Routes**
   - Keep `conversations.ts` routes
   - Deprecate `messages.ts` routes
   - Update frontend to use consistent endpoints

3. **Add Message Caching**
   - Cache user profiles in socket server
   - Use Redis for real-time data
   - Reduce HTTP calls between services

4. **Implement Pagination**
   - Load messages in chunks (e.g., 50 at a time)
   - Infinite scroll in chat interface
   - Reduce initial load time

#### Long-term Improvements

1. **Microservices Architecture**
   - Separate messaging service
   - Message queue (RabbitMQ/Kafka)
   - Event-driven architecture

2. **Advanced Features**
   - Message threading
   - Rich media support (images, videos)
   - Voice messages
   - Read receipts per message
   - Message reactions/emojis
   - Message search

3. **Performance Optimization**
   - WebSocket connection pooling
   - Message compression
   - CDN for media files
   - Database query optimization

4. **Security Enhancements**
   - End-to-end encryption
   - Message expiration
   - Rate limiting per user
   - Content moderation

---

## Testing Checklist

### Unit Tests
- [ ] Message sending logic
- [ ] Message receiving logic
- [ ] Conversation list filtering
- [ ] Unread count calculation
- [ ] Mark as read functionality

### Integration Tests
- [ ] Socket.IO connection
- [ ] JWT authentication
- [ ] Message persistence
- [ ] Notification creation
- [ ] REST API fallback

### E2E Tests
- [ ] Send message end-to-end
- [ ] Receive real-time message
- [ ] Load conversation history
- [ ] Search conversations
- [ ] Mark messages as read

### Performance Tests
- [ ] Load 1000+ messages
- [ ] 100+ concurrent users
- [ ] Message latency < 100ms
- [ ] Socket reconnection time

---

## Deployment Considerations

### Socket Server
- Requires sticky sessions for Socket.IO
- Use Redis adapter for horizontal scaling
- Set up health checks
- Configure CORS properly

### HTTP Backend
- Standard REST API deployment
- Database connection pooling
- Rate limiting per endpoint

### Frontend
- WebSocket URL configuration
- Fallback to polling if WebSocket blocked
- Retry logic for failed connections

---

## Conclusion

The messaging system is **functional but could be simplified**. The hybrid approach (Socket.IO + REST API) provides good reliability, but the dual database system (PostgreSQL + Firestore) adds unnecessary complexity. 

**Key Strengths:**
- Real-time messaging works well
- Good fallback mechanisms
- Clean UI components
- Proper state management with Zustand

**Areas for Improvement:**
- Consolidate storage (one database)
- Remove duplicate API routes
- Add message pagination
- Implement caching
- Add missing features (edit, delete, files)

Overall, the system is production-ready for small to medium scale, but would benefit from refactoring for larger deployments.

