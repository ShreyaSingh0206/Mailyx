
# Mailyx – AI-Powered Email Assistant

Mailyx is an AI-powered email management platform designed to help personal assistants manage client inboxes efficiently. It analyzes incoming emails, identifies who needs to respond, generates summaries, extracts action items, and assists with drafting replies.

## Features

- **Role-Based Authentication:** Separate dashboards for assistants and clients.
- **AI Email Classification:** Classifies emails into `assistant_reply`, `client_reply`, and `no_reply`.
- **Smart Email Summaries:** Generates concise summaries of incoming emails.
- **Action Item Extraction:** Identifies important tasks and follow-ups from emails.
- **AI Reply Drafting:** Generates contextual reply suggestions.
- **Email Management:** Search, filter, and organize emails.
- **Client Management:** Allows assistants to manage multiple client inboxes.
- **Role-Based Access Control:** Ensures assistants and clients access only their permitted features.

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router
- Axios
- Lucide React

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcrypt

### AI Integration
- Google Gemini API
- Groq API

## Application Workflow

1. Users log in using their respective roles.
2. Assistants access their dashboard and manage client emails.
3. The AI analyzes incoming emails and classifies them based on who needs to respond.
4. Important emails are summarized, and action items are extracted.
5. Assistants can review classifications and generate reply drafts.
6. Clients can access emails requiring their attention and mark them as handled or request assistance.

## Live Application

[Visit Mailyx](https://frontend-six-theta-77.vercel.app)

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Assistant | shreya@gmail.com | 123456 |
| Client | aarav@mehtacapital.test | Demo@1234 |

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ShreyaSingh0206/Mailyx.git
cd Mailyx
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

LLM_PROVIDER_ORDER=gemini,groq
NODE_ENV=development
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

The application will be available at:

`http://localhost:5173`

## Deployment

- **Frontend:** Deployed on Vercel
- **Backend:** Deployed on Render
- **Database:** MongoDB Atlas

Configure the appropriate environment variables in the deployment platforms before running the application.

## Project Note

Mailyx currently uses simulated email data to demonstrate its AI-powered email management workflow. It does not require users to connect real Gmail or Outlook accounts for the prototype.

## Author

**Shreya Kumari**

GitHub: [ShreyaSingh0206](https://github.com/ShreyaSingh0206)
