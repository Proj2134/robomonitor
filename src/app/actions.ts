'use server';

import { spawn } from 'child_process';
import type { Readable } from 'stream';

// This function converts a Node.js Readable stream to a Web ReadableStream.
function nodeToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            nodeStream.on('data', (chunk) => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err) => controller.error(err));
        },
        cancel() {
            nodeStream.destroy();
        }
    });
}

export async function runRobocopy(source: string, destination: string): Promise<ReadableStream<string>> {
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

  // Robocopy outputs data to stdout. We can use this stream.
  // We need to handle the encoding from the process.
  proc.stdout.setEncoding('utf8');

  // Convert the Node.js stream from the process to a Web Stream
  const webStream = nodeToWebStream(proc.stdout);

  // We need to decode the text from the stream of Uint8Array chunks.
  const textStream = webStream.pipeThrough(new TextDecoderStream());

  return textStream;
}
