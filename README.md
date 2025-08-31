# 🎤 Voice Shopping Assistant

A modern, AI-powered voice shopping list application that allows users to add, remove, and search items using natural speech commands.

## ✨ Features

- **🎤 Voice Commands**: Add, remove, and search items using natural speech
- **📦 Inventory Management**: Check stock availability and browse by categories
- **🌍 Multi-language Support**: English, Spanish, French, German, Hindi
- **📱 Responsive Design**: Modern UI that works on all devices
- **⚡ Auto-stop Recording**: Intelligent silence detection for efficiency
- **🔍 Smart Search**: Find items by name, category, or price range

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- AssemblyAI API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gauravsingh096/Unthinkable-Assesment.git
   cd voice-shopping
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   echo "ASSEMBLYAI_API_KEY=your_api_key_here" > .env
   ```

4. **Start the backend server**
   ```bash
   npm run server
   ```

5. **Start the frontend (in a new terminal)**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Live: https://unthinkableshoppingassistant.vercel.app/
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001



## 🎯 Voice Commands

### Add Items
- "Add 2 bottles of water"
- "Buy 1 kg apples"
- "Put milk in my cart"

### Remove Items
- "Remove milk"
- "Delete last item"
- "Remove item number 2"

### Search & Inventory
- "Check if milk is available"
- "Search for bread under $5"
- "Show dairy category"

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Express.js + Node.js
- **AI**: AssemblyAI Speech-to-Text
- **Styling**: CSS3 with modern gradients and animations
- **Deployment**: Vercel (serverless functions)

## 📁 Project Structure

```
voice-shopping/
├── src/                    # React frontend
│   ├── App.jsx           # Main application component
│   └── App.css           # Styling and animations
├── api/                   # Vercel serverless functions
│   └── transcribe.js     # Speech-to-text API endpoint
├── server.js              # Local development server
├── vercel.json            # Vercel deployment config
└── package.json           # Dependencies and scripts
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ASSEMBLYAI_API_KEY` | Your AssemblyAI API key | Yes |

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues:
1. Check the [Issues](https://github.com/Gauravsingh096/Unthinkable-Assesment/issues) page
2. Create a new issue with detailed information
3. Include browser console logs and error messages

## 🎉 Acknowledgments

- AssemblyAI for speech recognition
- React team for the amazing framework
- Vercel for seamless deployment

---

**Made with ❤️ by [Gaurav]**
** Live Link: [https://unthinkableshoppingassistant.vercel.app/]**