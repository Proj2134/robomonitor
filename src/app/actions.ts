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

export async function runRobocopy(source: string, destination: string, operation: 'copy' | 'move', scope: 'all' | 'latest'): Promise<ReadableStream<Uint8Array>> {
  
  const baseArgs = [source, destination];
  
  if (operation === 'move') {
    // /MOVE moves files AND directories (deletes from source after copy)
    baseArgs.push('/MOVE');
  } else {
    // /E copies subdirectories, including empty ones
    baseArgs.push('/E');
  }

  if (scope === 'latest') {
    // /MAXAGE:1 includes files with a Last Modified Date within the last 1 day.
    baseArgs.push('/MAXAGE:1');
  }

  // /V (verbose), /ETA (estimated time), /R:3 (3 retries), /W:10 (10s wait between retries)
  const commonArgs = ['/V', '/R:3', '/W:10', '/ETA'];
  const args = [...baseArgs, ...commonArgs];

  const robocopyProcess = spawn('robocopy', args, { shell: true });

  let errorData = '';
  robocopyProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });
  
  robocopyProcess.on('error', (err) => {
    console.error("Spawn error:", err);
  });
  
  const exitPromise = new Promise<void>((resolve, reject) => {
    robocopyProcess.on('close', (code) => {
      // Robocopy uses exit codes < 8 for success (e.g. files copied, extra files, etc.)
      if (code !== null && code < 8) {
        resolve();
      } else {
        const errorMessage = `Robocopy failed with exit code ${code}.\n\nSTDERR:\n${errorData}`;
        console.error(errorMessage);
        reject(new Error("Failed to run robocopy script. Check server logs for details."));
      }
    });
  });

  const stdoutWebStream = nodeToWebStream(robocopyProcess.stdout);

  // We need a way to combine the exit promise with the stream
  const reader = stdoutWebStream.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // Once the stream is done, wait for the exit code check to complete
          await exitPromise;
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        // The exit promise might have already rejected, but we catch here too
        controller.error(error);
      }
    },
    cancel(reason) {
      reader.cancel(reason);
      robocopyProcess.kill();
    }
  });
}
