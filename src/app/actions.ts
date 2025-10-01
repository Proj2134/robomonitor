'use server';

import { spawn } from 'child_process';

export async function runRobocopy(source: string, destination: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Security Note: In a real-world application, you would need to rigorously sanitize
    // these inputs to prevent command injection attacks. For this example, we'll
    // assume the inputs are trusted.
    const args = [
      source,
      destination,
      '/E',       // Copy subdirectories, including empty ones.
      '/V',       // Produce verbose output, showing skipped files.
      '/R:3',     // Number of Retries on failed copies.
      '/W:10',    // Wait time between retries.
      '/NP',      // No Progress - don't display % copied.
      '/ETA',     // Show Estimated Time of Arrival of copied files.
    ];

    const proc = spawn('robocopy', args, {
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    // Robocopy outputs data to stdout. We can use this stream.
    // We need to handle the encoding from the process.
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (data) => {
      stdout += data;
    });

    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
        // Robocopy returns non-zero exit codes even on success (e.g., 1 means files were copied).
        // A code >= 8 usually indicates a failure.
        if (code !== null && code >= 8) {
            console.error(`Robocopy process exited with code ${code}`);
            console.error('Stderr:', stderr);
            reject(new Error(`Robocopy failed with exit code ${code}.\n${stderr || stdout}`));
        } else {
            resolve(stdout);
        }
    });

    proc.on('error', (err) => {
        console.error('Failed to start robocopy process:', err);
        reject(err);
    });
  });
}
