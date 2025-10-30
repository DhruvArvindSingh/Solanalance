# Messaging System - Quick Reference

## 🏗️ System Components

### Frontend (React + Zustand)
```
src/components/messaging/
├── MessagingWidget.tsx      → Main floating chat widget
├── ConversationList.tsx     → List of all conversations
├── ActiveChat.tsx           → Active conversation view
├── MessageBubble.tsx        → Individual message component
└── MessagingInitializer.tsx → Socket initialization

src/stores/
└── messagingStore.ts        → Zustand state management
```

### Socket Server (Port 3001)
```
socket-server/src/
└── index.ts                 → Socket.IO server + Firebase Firestore
```

### HTTP Backend (Port 3000)
```
http-backend/src/routes/
├── conversations.ts         → REST API for conversations
└── messages.ts             → Alternative message API (legacy?)
```

---

## 🔄 Message Flow

### Sending a Message
```
User Input → ActiveChat → messagingStore.sendMessage()
    ↓
Socket.IO emit('send-message') → Socket Server
    ↓
Save to Firestore + Broadcast to room → Other User
    ↓
handleNewMessage() → Update UI
```

### Loading Conversations
```
Widget Mount → loadConversations()
    ↓
GET /api/conversations → HTTP Backend
    ↓
PostgreSQL Query → Return data
    ↓
Update Zustand store → Render list
```

---

## 📊 Data Storage

### PostgreSQL (Primary)
- **Table:** `messages`
- **Fields:** id, project_id, sender_id, content, message_type, file_url, is_read, created_at
- **Used for:** Persistent storage, REST API queries

### Firestore (Real-time)
- **Collection:** `messages`
- **Fields:** id, projectId, senderId, content, messageType, createdAt, readBy[]
- **Used for:** Real-time message sync, Socket.IO

---

## 🔌 API Endpoints

### REST API (HTTP Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/conversations` | GET | Get all conversations |
| `/api/conversations/:projectId/messages` | GET | Get messages for project |
| `/api/conversations/:projectId/messages` | POST | Send message |
| `/api/conversations/:projectId/read` | PATCH | Mark as read |

### Socket.IO Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-project` | Client → Server | Join project room |
| `send-message` | Client → Server | Send message |
| `new-message` | Server → Client | Receive message |
| `typing-start` | Client → Server | User typing |
| `user-typing` | Server → Client | Show typing indicator |
| `typing-stop` | Client → Server | Stop typing |
| `user-stopped-typing` | Server → Client | Hide typing indicator |

---

## 🎯 Key Features

✅ Real-time messaging via Socket.IO  
✅ REST API fallback  
✅ Typing indicators  
✅ Online status tracking  
✅ Unread message counts  
✅ Read receipts  
✅ Search conversations  
✅ Automatic mark as read  
✅ Notifications  

❌ No message editing  
❌ No message deletion  
❌ No file uploads (via socket)  
❌ No group chats  
❌ No message reactions  

---

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```env
VITE_SOCKET_URL=http://localhost:3001
```

**Socket Server (.env)**
```env
SOCKET_PORT=3001
JWT_SECRET=your-secret
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=your-email
```

**HTTP Backend (.env)**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

---

## 🚨 Common Issues

### Issue: Messages not appearing in real-time
**Solution:** Check if Socket.IO connection is established
```javascript
// In browser console:
useMessagingStore.getState().socket?.connected
```

### Issue: Unread counts not updating
**Solution:** Call `markAsRead()` when opening conversation
```javascript
selectConversation(projectId); // Automatically marks as read
```

### Issue: Socket disconnects frequently
**Solution:** 
1. Check CORS configuration in socket server
2. Verify JWT token is valid
3. Check firewall/proxy settings

---

## 📝 Usage Examples

### Send a Message (from any component)
```typescript
import { useMessagingStore } from '@/stores/messagingStore';

const { sendMessage } = useMessagingStore();

await sendMessage('project-123', 'Hello!', 'recipient-id');
```

### Load Conversations
```typescript
const { loadConversations, conversations } = useMessagingStore();

useEffect(() => {
    loadConversations();
}, []);
```

### Select a Conversation
```typescript
const { selectConversation, messages } = useMessagingStore();

// This will:
// 1. Set selectedProjectId
// 2. Load messages if not cached
// 3. Mark messages as read
selectConversation('project-123');

const activeMessages = messages['project-123'] || [];
```

### Check Unread Count
```typescript
const { unreadTotal, unreadCounts } = useMessagingStore();

console.log(`Total unread: ${unreadTotal}`);
console.log(`Project 123 unread: ${unreadCounts['project-123']}`);
```

---

## 🐛 Debugging

### Enable Socket.IO Debug Logs
```javascript
localStorage.debug = 'socket.io-client:socket';
```

### Check Current State
```javascript
// In browser console:
useMessagingStore.getState()
```

### Monitor Socket Events
```javascript
const socket = useMessagingStore.getState().socket;
socket?.onAny((event, ...args) => {
    console.log('Socket event:', event, args);
});
```

---

## 📦 Dependencies

### Frontend
- `socket.io-client` - WebSocket client
- `zustand` - State management
- `date-fns` - Date formatting

### Socket Server
- `socket.io` - WebSocket server
- `firebase-admin` - Firestore access
- `express` - HTTP server
- `jsonwebtoken` - JWT auth

### HTTP Backend
- `express` - REST API
- `prisma` - Database ORM
- `@prisma/client` - Database client

---

## 🔐 Security

### Authentication
- JWT tokens passed via Socket.IO handshake
- Middleware validates token before connection
- REST API uses bearer token authentication

### Authorization
- Users can only access their own projects
- Messages verified against project membership
- Room access controlled by project participation

### Data Validation
- Message content trimmed and validated
- Project ID verified before operations
- SQL injection prevented via Prisma ORM

---

## 📈 Performance Considerations

### Current Limitations
- No message pagination (loads all at once)
- No caching (fetches from DB every time)
- Profile fetching on every message (Socket server → HTTP backend)

### Optimization Opportunities
1. Implement message pagination (50 per page)
2. Cache user profiles in Redis
3. Use database connection pooling
4. Implement message compression
5. Add CDN for media files

---

## 🚀 Future Enhancements

### Priority 1 (High Impact)
- Message pagination
- File upload support
- Message editing
- Message deletion

### Priority 2 (Medium Impact)
- Group conversations
- Message reactions
- Rich text formatting
- Voice messages

### Priority 3 (Nice to Have)
- End-to-end encryption
- Message search
- Message forwarding
- Custom emojis

---

## 📞 Support

For issues or questions:
1. Check console for error logs
2. Verify Socket.IO connection status
3. Check network tab for failed requests
4. Review this documentation

Common error codes:
- `401` - Authentication failed (check JWT token)
- `403` - Unauthorized access (not in project)
- `404` - Project not found
- `500` - Server error (check logs)

