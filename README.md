# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally

To run this application on your local machine, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the `.env.example` file.
    ```bash
    cp .env.example .env
    ```
    You will need to add a Gemini API key to the `.env` file. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

3.  **Run the development servers:**
    This application uses Genkit for AI features, so you'll need to run both the Genkit server and the Next.js development server.

    In your first terminal, start the Genkit server:
    ```bash
    npm run genkit:dev
    ```

    In a second terminal, start the Next.js development server:
    ```bash
    npm run dev
    ```

4.  **Open the application:**
    Once both servers are running, open your browser and navigate to [http://localhost:9002](http://localhost:9002).
