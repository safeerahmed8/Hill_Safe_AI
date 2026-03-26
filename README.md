<div align="center">

# 🏔️ Hill Safe AI

### AI-Powered Road Safety System for Hilly & Mountainous Terrain

![JavaScript](https://img.shields.io/badge/JavaScript-Node.js-yellow?style=for-the-badge&logo=javascript)
![Express](https://img.shields.io/badge/Backend-Express.js-black?style=for-the-badge&logo=express)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue?style=for-the-badge&logo=mysql)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

> *Saving lives on dangerous hilly roads through the power of Artificial Intelligence*

</div>

---

## 📌 Overview

**Hill Safe AI** is an intelligent road safety system specifically designed
for hilly and mountainous roads — one of the most dangerous driving
environments in the world. The system manages vehicles, drivers, zones,
challans, and incidents through a powerful REST API backend built with
Node.js, Express.js and MySQL.

---

## 🚀 Key Features

- 🚗 **Vehicle Management** — Track and monitor all vehicles on hilly roads
- 👤 **Driver Management** — Manage driver records and history
- 🗺️ **Zone Management** — Define and monitor dangerous road zones
- 📋 **Challan System** — Issue and track traffic challans
- 🚨 **Incident Reporting** — Record and retrieve road incidents
- 🔌 **REST API** — Clean and powerful API for all operations
- 🗄️ **MySQL Database** — Reliable and fast data storage
- ⚡ **Real-Time Server** — Fast Express.js backend

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Language | JavaScript |
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL |
| Environment | dotenv |
| IDE | VS Code |

---

## ⚙️ Installation

### Step 1 — Clone the Repository
```bash
git clone https://github.com/safeerahmed/hill-safe-ai.git
cd hill-safe-ai
```

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — Setup Environment Variables
Create a `.env` file in root folder:
```
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=hill_safe_ai
PORT=3000
```

### Step 4 — Run the Server
```bash
node server.js
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vehicles` | Get all vehicles |
| GET | `/vehicles/id/1` | Get vehicle by ID |
| GET | `/vehicles/plate/JK-01-AB-1234` | Get vehicle by plate |
| GET | `/zones` | Get all zones |
| GET | `/drivers` | Get all drivers |
| GET | `/challans` | Get all challans |
| GET | `/incidents` | Get all incidents |

---

## 📁 Project Structure
```
hill-safe-ai/
│
├── server.js           # Main Express.js server
├── db.js               # MySQL database connection
├── package.json        # Project dependencies
├── package-lock.json   # Dependency lock file
├── .env                # Environment variables (not uploaded)
├── .gitignore          # Git ignore rules
├── CHANGELOG.md        # Daily development log
└── README.md           # Project documentation
```

---

## 🚦 How It Works
```
Client Request
      ↓
Express.js Server (server.js)
      ↓
MySQL Database (db.js)
      ↓
JSON Response to Client
```

---

## 📅 Development Progress

| Day | Date | Work Done |
|-----|------|-----------|
| Day 1 | March 26, 2026 | Backend server, MySQL DB, all core APIs built |
| Day 2 | Coming Soon | Frontend UI |
| Day 3 | Coming Soon | AI Hazard Detection |

See full details in [CHANGELOG.md](CHANGELOG.md)

---

## 🤝 Contributing

Contributions are welcome and appreciated! Here's how:

1. **Fork** the repository
2. Create your feature branch
```bash
   git checkout -b feature/AmazingFeature
```
3. Commit your changes
```bash
   git commit -m "Add AmazingFeature"
```
4. Push to the branch
```bash
   git push origin feature/AmazingFeature
```
5. Open a **Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** —
see the [LICENSE](LICENSE) file for full details.

---

## 👨‍💻 Author

<div align="center">

### **Safeer Ahmed**
*AI Developer & Road Safety Innovator*

[![GitHub](https://img.shields.io/badge/GitHub-safeerahmed-black?style=for-the-badge&logo=github)](https://github.com/safeerahmed/hill-safe-ai)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Safeer%20Ahmed-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/safeer-ahmed-8379bb251)

📌 **GitHub:** https://github.com/safeerahmed/hill-safe-ai

💼 **LinkedIn:** https://www.linkedin.com/in/safeer-ahmed-8379bb251

</div>

---

<div align="center">

⭐ **If this project helped you, please give it a star!** ⭐

*Built with ❤️ by Safeer Ahmed to make mountain roads safer for everyone*

</div>
