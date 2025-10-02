# LinkedIn Genie

LinkedIn Genie is a web application designed to help users analyze their professional network by leveraging Large Language Models (LLMs). Users can upload their LinkedIn connections data as a CSV file and interact with it through a natural language query interface.

## Features

- **CSV Upload:** Securely upload your LinkedIn connections data (Connections.csv).
- **Automated Data Mapping:** The application intelligently suggests column mappings from your CSV file to standard fields like name, company, position, etc.
- **AI-Powered Querying:** Ask questions about your network in plain English (e.g., "Show me all software engineers at Google"). The backend uses an LLM to parse these queries and filter your connections accordingly.
- **Advanced Filtering:** A comprehensive filtering panel allows for granular control over the displayed connections based on company, position keywords, location, and connection metrics.
- **Connection Details:** View detailed information for each connection, including their professional details and inferred network metrics.
- **Network Metrics Dashboard:** Get a high-level overview of your network with key statistics like total connections, top companies, top positions, and more.

## Tech Stack

### Frontend

- **React** with **TypeScript**
- **Vite** for fast development and bundling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization in the metrics panel
- **Axios** for API communication

### Backend

- **FastAPI** (Python) for building the REST API
- **Groq** for LLM-based natural language query parsing
- **Pandas** for CSV data manipulation
- **NetworkX** for graph-based analysis and metric calculation
- **Scikit-learn** for TF-IDF based text similarity

## Deployment

### Frontend (GitHub Pages)

The frontend is a static application built with Vite and is configured for deployment on GitHub Pages.

1.  **Build the application:**
    ```bash
    npm run build
    ```
2.  **Deploy to GitHub Pages:**
    ```bash
    npm run deploy
    ```
    This script uses the `gh-pages` package to push the contents of the `dist` folder to the `gh-pages` branch of your repository.

### Backend

The backend is a FastAPI application that needs to be deployed separately on a service like Vercel, Heroku, or any other cloud provider that supports Python applications.

1.  **Set Environment Variables:**
    Create a `.env` file in the `backend` directory and add your Groq API key:
    ```
    GROQ_API_KEY=your_groq_api_key_here
    ```

2.  **Update Frontend API URL:**
    In the frontend's `.env` file, update `VITE_API_BASE_URL` to point to your deployed backend's URL.

    ```
    VITE_API_BASE_URL=[https://your-backend-deployment-url.com](https://your-backend-deployment-url.com)
    ```

## Local Development

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/linkedin-genie.git](https://github.com/your-username/linkedin-genie.git)
    cd linkedin-genie
    ```

2.  **Setup the Backend:**
    ```bash
    cd backend
    python -m venv env
    source env/bin/activate  # On Windows, use `env\Scripts\activate`
    pip install -r requirements.txt
    # Add your GROQ_API_KEY to a new .env file
    uvicorn app:app --reload
    ```
    The backend will be running at `http://localhost:8000`.

3.  **Setup the Frontend:**
    In a new terminal:
    ```bash
    cd ..
    npm install
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173`.