'use server';

import { spawn } from 'child_process';
import { Readable } from 'stream';

// A simple stream to wrap the Node.js process output
function iteratorToStream(iterator: any) {
  return new Readable({
    async read() {
      const { value, done } = await iterator.next()
      if (done) {
        this.push(null);
      } else {
        this.push(value);
      }
    },
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

  const iterator = (async function*() {
    // A new line may not be a complete line, so we buffer it
    let buffer = '';
    for await (const chunk of proc.stdout) {
      buffer += chunk.toString();
      // Robocopy output seems to use \r\n, but we'll handle \n too
      const lines = buffer.split(/\r\n|\n/);
      // The last element might be a partial line, so we keep it in the buffer
      buffer = lines.pop() || '';
      for (const line of lines) {
        yield line + '\n';
      }
    }
    // Yield any remaining data in the buffer
    if (buffer.length > 0) {
      yield buffer;
    }
  })();
  
  const stream = iteratorToStream(iterator).pipe(new TextEncoderStream());

  return stream;
}

