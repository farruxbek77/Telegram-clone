# Telegram Clone

Modern Telegram clone built with React, Node.js, Socket.IO, and Express.

## Features

- 💬 Real-time messaging with Socket.IO
- 👥 Group chats with multi-step creation
- 🔒 Private messaging
- 📷 Image sharing
- 🎥 Video sharing
- 📎 File sharing (all types up to 50MB)
- ✅ Message read receipts (WhatsApp-style)
- 🔔 Real-time notifications with badge counts
- 🌙 Dark/Light theme support
- ⚙️ User settings (Privacy, Notifications, Appearance)
- 👤 User profiles with avatar upload
- 🟢 Online/Offline status tracking
- 📱 Fully responsive design
- 🎨 Telegram-style UI

## Tech Stack

### Frontend
- React 18
- Socket.IO Client
- Axios
- React Hot Toast
- CSS3 with Telegram-style design

### Backend
- Node.js
- Express
- Socket.IO
- JWT Authentication
- Multer (file uploads)
- Bcrypt (password hashing)

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/farruxbek77/Telegram-clone.git
cd Telegram-clone
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Start the development servers:

**Server (Port 5005):**
```bash
cd server
node server-simple.js
```

**Client (Port 3001):**
```bash
cd client
npm start
```

4. Open your browser and navigate to `http://localhost:3001`

## Deployment

### Render.com (Backend)

1. Push your code to GitHub
2. Create a new Web Service on Render.com
3. Connect your repository: `farruxbek77/Telegram-clone`
4. Use the following settings:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `MONGODB_URI`: Your MongoDB connection string (MongoDB Atlas)
     - `JWT_SECRET`: Generate a strong random string
     - `CLIENT_URL`: Your frontend URL (e.g., https://your-app.vercel.app)

### Vercel/Netlify (Frontend)

1. Create a new project
2. Connect your repository
3. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Environment Variables:**
     - `REACT_APP_API_URL`: Your backend URL (e.g., https://telegram-clone-backend.onrender.com)

**Note:** Alternatively, you can use the included `render.yaml` file for automatic deployment via Render Blueprint.

## Usage

### Authentication
- Click "Chatga Kirish" button to enter (passwordless authentication)
- System automatically creates a user account

### Messaging
- Select a chat from the left panel
- Type your message and press Enter or click Send
- Messages show read receipts (✓ = sent, ✓✓ = read)

### Group Chats
- Click the group icon in the header
- Follow the 3-step process:
  1. Enter group info (name, description, icon)
  2. Select members
  3. Confirm and create

### File Sharing
- Click the image icon to share photos
- Click the video icon to share videos
- Click the document icon to share any file type (up to 50MB)

### Settings
- Click the settings icon to customize:
  - Privacy settings
  - Notification preferences
  - Theme (Dark/Light)

## Project Structure

```
telegram-clone/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/     # React components
│       │   ├── Auth/       # Login/Register
│       │   ├── Chat/       # Main chat interface
│       │   ├── Profile/    # User profile
│       │   ├── Search/     # User search
│       │   ├── Settings/   # App settings
│       │   └── CreateGroup/# Group creation
│       ├── context/        # React context
│       ├── services/       # API services
│       └── App.js
├── server/                 # Node.js backend
│   ├── middleware/         # Auth middleware
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── uploads/           # File uploads
│   └── server-simple.js   # Main server file
└── README.md

```

## Features in Detail

### Real-time Messaging
- Instant message delivery using Socket.IO
- Typing indicators
- Online/offline status
- Last seen timestamps

### Notifications
- Real-time notification badges
- Unread message counts per chat
- Total unread count in header
- Auto-clear on chat open

### File Uploads
- Images (up to 5MB)
- Videos (up to 50MB)
- Documents (up to 50MB)
- All file types supported except dangerous executables

### Security
- JWT-based authentication
- Secure file upload validation
- XSS protection
- CORS configuration

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
MIT

## Author
Farruxbek

## Acknowledgments
- Telegram for design inspiration
- Socket.IO for real-time communication
- React team for the amazing framework
