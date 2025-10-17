# Socket Server for Real-time Messaging

This socket server provides real-time messaging and notification functionality using Socket.IO and Firebase Firestore.

## Features

- **Real-time messaging**: Instant message delivery using WebSocket connections
- **Project-based chat rooms**: Messages are organized by project
- **Typing indicators**: Shows when users are typing
- **Notifications**: Real-time notifications for new messages
- **Firebase integration**: Messages and notifications stored in Firestore
- **JWT authentication**: Secure authentication using JWT tokens

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore database
3. Create a service account:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

### 3. Environment Variables

Add the following to your `.env` file (in the root directory):

```env
# Socket Server Configuration
SOCKET_PORT=3001

# Firebase Configuration (from your service account JSON)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# JWT Secret (should match your main app)
JWT_SECRET=your-super-secret-jwt-key
```

### 4. Firestore Security Rules

Add these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages - users can read/write messages for projects they have access to
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }

    // Notifications - users can only access their own notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The server will start on port 3001 by default.

## API Endpoints

### WebSocket Events

#### Client → Server

- `join-project`: Join a project chat room
  ```javascript
  socket.emit('join-project', projectId);
  ```

- `leave-project`: Leave a project chat room
  ```javascript
  socket.emit('leave-project', projectId);
  ```

- `send-message`: Send a message
  ```javascript
  socket.emit('send-message', {
    projectId: 'project-id',
    content: 'Hello world!',
    messageType: 'text',
    recipientId: 'user-id' // optional
  });
  ```

- `typing-start`: Indicate user started typing
  ```javascript
  socket.emit('typing-start', { projectId: 'project-id' });
  ```

- `typing-stop`: Indicate user stopped typing
  ```javascript
  socket.emit('typing-stop', { projectId: 'project-id' });
  ```

#### Server → Client

- `joined-project`: Confirmation of joining project
  ```javascript
  socket.on('joined-project', (data) => {
    console.log('Joined project:', data.projectId);
  });
  ```

- `new-message`: New message received
  ```javascript
  socket.on('new-message', (message) => {
    console.log('New message:', message);
  });
  ```

- `notification`: New notification
  ```javascript
  socket.on('notification', (notification) => {
    console.log('New notification:', notification);
  });
  ```

- `user-typing`: User started typing
  ```javascript
  socket.on('user-typing', (data) => {
    console.log('User typing:', data.userId);
  });
  ```

- `user-stopped-typing`: User stopped typing
  ```javascript
  socket.on('user-stopped-typing', (data) => {
    console.log('User stopped typing:', data.userId);
  });
  ```

### REST API Endpoints

- `GET /health`: Health check
- `GET /api/messages/project/:projectId`: Get messages for a project
- `POST /api/messages`: Send a message via REST
- `GET /api/notifications/:userId`: Get notifications for a user
- `PUT /api/notifications/:notificationId/read`: Mark notification as read

## Database Schema

### Messages Collection

```javascript
{
  id: string,
  projectId: string,
  senderId: string,
  content: string,
  messageType: string, // 'text', 'image', etc.
  recipientId?: string,
  createdAt: timestamp,
  readBy: string[] // array of user IDs who have read the message
}
```

### Notifications Collection

```javascript
{
  id: string,
  userId: string,
  title: string,
  message: string,
  type: string, // 'message', 'payment', etc.
  relatedId?: string,
  read: boolean,
  createdAt: timestamp
}
```

## Integration with Frontend

The socket server integrates with the existing ProjectMessages component, which automatically:

1. Connects to the socket server on mount
2. Joins the project room
3. Sends/receives messages in real-time
4. Shows typing indicators
5. Displays notifications

Make sure your frontend has `socket.io-client` installed and is connecting to the correct socket server URL.
