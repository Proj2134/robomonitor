'use server';

import { spawn } from 'child_process';

export async function runRobocopy(source: string, destination: string): Promise<string> {
  // These arguments are chosen for verbose logging, which is good for monitoring.
  // /S :: copy Subdirectories, but not empty ones.
  // /E :: copy subdirectories, including Empty ones.
  // /V :: produce Verbose output, showing skipped files.
  // /R:3 :: Retry 3 times on failed copies.
  // /W:10 :: Wait 10 seconds between retries.
  // /NP :: No Progress - don't display % copied.
  // /ETA :: show Estimated Time of Arrival of copied files.
  const args = [source, destination, '/S', '/E', '/V', '/R:3', '/W:10', '/NP', '/ETA'];

  return new Promise((resolve, reject) => {
    // Using { shell: true } is important on Windows to ensure system commands can be found.
    const robocopyProcess = spawn('robocopy', args, { shell: true });

    let stdout = '';
    let stderr = '';

    robocopyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    robocopyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    robocopyProcess.on('close', (code) => {
      // Robocopy has several "success" exit codes.
      // Codes 0-7 indicate success (e.g., files were copied, no errors).
      // We will treat anything less than 8 as a success.
      if (code !== null && code < 8) {
        resolve(stdout);
      } else {
        // Robocopy often outputs informational text to stderr, so we combine them.
        const errorMessage = `Robocopy failed with exit code ${code}.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
        console.error(errorMessage);
        reject(new Error("Failed to run robocopy script. Check server logs for details."));
      }
    });

    robocopyProcess.on('error', (err) => {
      console.error("Spawn error:", err);
      reject(new Error("Failed to run robocopy script. Make sure it's installed and you're on a Windows machine."));
    });
  });
}
