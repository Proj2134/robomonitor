'use server';

import { spawn } from 'child_process';

// Helper to convert Node.js stream to a Web ReadableStream
function nodeToWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function runRobocopy(source: string, destination: string): Promise<ReadableStream<Uint8Array>> {
  const args = [source, destination, '/E', '/V', '/R:3', '/W:10', '/NP', '/ETA'];

  const robocopyProcess = spawn('robocopy', args, { shell: true });

  let errorData = '';
  robocopyProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });
  
  robocopyProcess.on('error', (err) => {
    console.error("Spawn error:", err);
    // This is handled by the promise rejection in the 'close' event
  });
  
  // Robocopy uses non-zero exit codes to indicate success with nuances.
  // Codes < 8 are generally considered success (files copied, extra files, etc.)
  // We need to wait for the process to close to check the exit code.
  const exitPromise = new Promise<void>((resolve, reject) => {
    robocopyProcess.on('close', (code) => {
      if (code !== null && code < 8) {
        resolve();
      } else {
        const errorMessage = `Robocopy failed with exit code ${code}.\n\nSTDERR:\n${errorData}`;
        console.error(errorMessage);
        // We reject here so the stream consumer knows there was a failure.
        reject(new Error("Failed to run robocopy script. Check server logs for details."));
      }
    });
  });

  const stdoutWebStream = nodeToWebStream(robocopyProcess.stdout);

  // We need a way to bubble up the exit code error to the stream reader.
  // We'll create a new stream that waits for the process to finish.
  const reader = stdoutWebStream.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // stdout is finished, now wait for the process to close to check the exit code.
          await exitPromise;
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        // This will catch errors from the stdout stream itself
        controller.error(error);
      }
    },
    cancel(reason) {
      reader.cancel(reason);
      robocopyProcess.kill();
    }
  });
}
