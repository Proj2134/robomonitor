# **App Name**: RoboMonitor

## Core Features:

- Initiate Copy Job: Allows the user to initiate a robocopy job from the web interface by sending an HTTP request to the server.
- Execute Robocopy: Executes robocopy on the server, capturing the stdout stream in a non-blocking way.
- Real-Time Progress Updates: Parses the raw robocopy output from stdout using regular expressions to extract real-time updates for:
- Display Parsing: -Current file being copied.
-Percentage complete (if /ETA is used).
-Total files processed.
 and transmits these to the client via websockets.
- Websocket Handler: Listens for new messages on the WebSocket connection and dynamically updates the UI with real-time progress.
- Intelligent Alerting: An AI tool that parses robocopy's log file to proactively alert users via the web interface to potential problems.

## Style Guidelines:

- Primary color: Steel blue (#4682B4) for reliability and professionalism.
- Background color: Light gray (#F0F0F0) for a clean and unobtrusive backdrop.
- Accent color: Forest green (#228B22) to indicate successful processes and highlights.
- Body and headline font: 'Inter', a sans-serif font for modern readability and clean interface design.
- Use clear and concise icons to represent different file types, status indicators, and actions.
- Implement a responsive design for accessibility across various screen sizes, using a clean and well-organized grid system.
- Employ subtle animations, like a loading animation, during the data transfer process for improved user experience.