# 🎯 MockMate

> AI-Powered Interview Preparation Platform

MockMate is an intelligent interview preparation tool that generates personalized interview questions and provides real-time feedback based on your resume and target job role. Practice interviews with AI-guided study sessions or simulate real interview scenarios with voice recognition and live evaluation.

![Built with React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)
![Powered by Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat&logo=google)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?style=flat&logo=tailwind-css)

---

## ✨ Features

### 🎓 **Guided Study Mode**
- AI-generated interview questions tailored to your resume and job description
- Expandable Q&A cards with detailed answer directions
- Key talking points and structured guidance
- Regenerate questions for varied practice
- Persistent session management

### 🎙️ **Test Mode (Mock Interview)**
- Real-time speech-to-text interview simulation
- Live video feed for presentation practice
- AI-powered answer evaluation and feedback
- Strength & improvement analysis
- Question navigation and randomization
- Performance scoring and detailed insights

### 📄 **Smart Resume Parsing**
- PDF upload and text extraction
- Manual resume input option
- Context-aware question generation
- Job description integration

### 💾 **Session Management**
- LocalStorage-based persistence
- Resume new session or continue existing
- Cross-mode question sharing
- Automatic data retention

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vansh-tambi/MockMate.git
   cd MockMate
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5000
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   ```
   The server will run on `http://localhost:5000`

2. **Start the frontend client** (in a new terminal)
   ```bash
   cd client
   npm run dev
   ```
   The client will run on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

---

## 📂 Project Structure

```
MockMate/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── GuidedMode.jsx      # Study mode with Q&A cards
│   │   │   ├── TestMode.jsx        # Mock interview simulator
│   │   │   ├── SetupScreen.jsx     # Resume/job input
│   │   │   └── Navbar.jsx          # Navigation bar
│   │   ├── App.jsx         # Main application component
│   │   ├── main.jsx        # Application entry point
│   │   └── index.css       # Global styles
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   └── README.md           # Client documentation
│
├── server/                 # Backend Express server
│   ├── index.js            # Server entry point & API routes
│   ├── CLEANED_QUESTIONS.txt  # Question bank
│   ├── package.json        # Backend dependencies
│   └── README.md           # Server documentation
│
├── test_randomization.py   # Testing utilities
└── README.md               # This file
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS 4.1** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Web Speech API** - Voice recognition

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Google Generative AI (Gemini)** - AI question generation and evaluation
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **CORS** - Cross-origin resource sharing

---

## 📖 Documentation

For detailed documentation, please refer to:
- [Client Documentation](./client/README.md) - Frontend setup and components
- [Server Documentation](./server/README.md) - Backend API and endpoints

---

## 🔧 API Overview

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse-resume` | POST | Parse PDF resume and extract text |
| `/api/generate-qa` | POST | Generate personalized interview questions |
| `/api/evaluate` | POST | Evaluate user's answer and provide feedback |

For detailed API documentation, see [Server README](./server/README.md).

---

## 🎨 Key Features Breakdown

### Guided Mode
- Browse AI-curated questions specific to your role
- View expected answer directions and talking points
- Toggle between questions with smooth animations
- Regenerate entire question set for fresh practice

### Test Mode
- Record video and audio for realistic interview practice
- Real-time speech transcription
- Submit answers for AI evaluation
- Receive detailed feedback with strengths and areas for improvement
- Navigate through questions or shuffle them randomly
- Track completion status

### Setup Screen
- Upload resume as PDF or enter manually
- Specify target job role/description
- Beautiful gradient animations and modern UI
- Data validation and error handling

---

## 🌟 Technologies Used

- **Gemini AI Models:** Intelligent question generation and answer evaluation using Google's latest language models (Gemini 1.5 Flash, Pro, 2.0 Flash)
- **Framer Motion:** Smooth, professional animations throughout the interface
- **Web Speech API:** Browser-native speech recognition for voice input
- **LocalStorage:** Client-side session persistence
- **Responsive Design:** Mobile-friendly interface with TailwindCSS

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Vansh Tambi**

- GitHub: [@vansh-tambi](https://github.com/vansh-tambi)
- Repository: [MockMate](https://github.com/vansh-tambi/MockMate)

---

## 🙏 Acknowledgments

- Google Gemini AI for powerful language model capabilities
- React and Vite teams for excellent developer experience
- TailwindCSS for utility-first styling
- Framer Motion for animation framework

---

## 🐛 Known Issues & Roadmap

- [ ] Add support for multiple resume formats (DOCX, TXT)
- [ ] Implement interview history tracking
- [ ] Add export functionality for practice sessions
- [ ] Support multiple languages
- [ ] Enhanced analytics and progress tracking
- [ ] Integration with calendar for scheduled practice
- [ ] Dark/Light theme toggle
- [ ] Mobile app version

---

## 📧 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

**Made with ❤️ by Vansh Tambi**
