# MedicoBud

MedicoBud is a modern medical application built with **React, TypeScript, FastAPI, and Tailwind CSS**. It provides an **interactive interface for disease diagnosis**, predicting conditions like **Fever, Jaundice, Food Poisoning, and Heart Disease** based on user inputs.

---

## File Descriptions

### API (Backend)
The api/ directory contains the FastAPI-based backend, responsible for handling data processing and API requests.

- main.py – Entry point for the FastAPI app, defining API routes.
- database.py – Handles database configuration and local database operations.
- models.py – Defines database models (tables, schemas).
- routes/ – Stores different API route handlers (organized by feature).
- services/ – Contains business logic and data processing before responding to UI requests.

The API reads data from a local database and processes requests from the frontend. It receives user input, processes it in the database, and sends responses back via HTTP methods (GET, POST, etc.).

### UI (Frontend)
The ui/ directory contains the React + TypeScript frontend, built with Vite, Tailwind CSS, and Redux for state management.

- components/ – Reusable UI components (buttons, modals, forms, etc.).
- pages/ – Page-level components (e.g., Home, Dashboard, Profile).
- assets/ – Stores images, icons, and other static files.
 
The UI fetches data from the API, displays it dynamically, and allows user interactions. Shadcn UI components are used for an enhanced, interactive user experience.

---

## Features
### **🩺 Fast Diagnosis**  
- Predicts potential diseases based on user symptoms.
- Provides severity assessment for medical conditions.

### **📖 Medical Library Page**  
- Displays a list of healthcare articles (title, cover image, and summary).  
- Users can click on articles to view full content.  
- Pagination for loading more content efficiently.

### **📋 User Diagnosis Form**  
- Easy-to-use form for entering patient details.  
- **Autocomplete for symptoms** (keyboard navigation included).  
- Sidebar navigation with **personal info, history, and settings**.  
- Users **must select at least three symptoms** before submitting.  

### **📱 Responsive Design**  
- Optimized for **mobile and desktop** with **Tailwind CSS**. 

---

## Project structure

medicobud/
│── api/                 # FastAPI Backend  
│   ├── main.py          # Main entry point, API endpoints  
│   ├── database.py      # Database configuration and operations  
│   ├── models.py        # Data models for the database  
│   ├── routes/          # API route handlers  
│   ├── services/        # Business logic and processing  
│── ui/                  # React + TypeScript + Redux Frontend  
│   ├── src/  
│   │   ├── components/  # Reusable UI components  
│   │   ├── pages/       # Page-level components  
│   │   ├── assets/      # Static assets (images, icons, etc.)  
│── docs/                # Documentation and API specifications  
│── README.md            # Project overview and setup instructions  

---

## Contributing
Want to contribute? Pull requests are welcome!

- Fork the repository
- Create a new branch (git checkout -b feature-branch)
- Commit your changes (git commit -m "Added a new feature")
- Push to your branch (git push origin feature-branch)
- Open a Pull Request

---

## 🚀 **Website Performance Metrics**  

| Metric                | Value  |
|-----------------------|--------|
| **API Response Time** | ~120ms |
| **Server Latency**    | ~50ms  |
| **Frontend Load Time**| ~1.2s  |
| **Lighthouse Score**  | 95% Performance, 90% Accessibility |

- Tested using **Postman & Locust** (for API performance).  
- **Lighthouse scores** measured in Chrome DevTools.  

---

## Installation

1. **Clone the Repository:**

   ```bash
   git clone git@github.com:imsidharthj/medicobud.git
   cd medicobud
   ```

2. **Npm:**
   ```bash
    npm install
   ```

3. **install requirement.txt:**
   ```bash
   Install requirement.tsx
   ```

4. **Run**
  - server
     ```bash
      Uvicron app.main : app --reload
     ```

  - UI
    ```bash
    npm run dev
    ```