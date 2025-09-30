'use server';

/**
 * @fileOverview An AI agent that analyzes robocopy logs and proactively alerts users to potential problems.
 *
 * - analyzeRobocopyLog - A function that analyzes robocopy logs for errors and alerts.
 * - AnalyzeRobocopyLogInput - The input type for the analyzeRobocopyLog function.
 * - AnalyzeRobocopyLogOutput - The return type for the analyzeRobocopyLog function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeRobocopyLogInputSchema = z.object({
  logContent: z
    .string()
    .describe('The content of the robocopy log file.'),
});
export type AnalyzeRobocopyLogInput = z.infer<typeof AnalyzeRobocopyLogInputSchema>;

const AnalyzeRobocopyLogOutputSchema = z.object({
  alerts: z.array(
    z.object({
      severity: z.enum(['info', 'warning', 'error']),
      message: z.string(),
    })
  ).describe('A list of alerts generated from the log analysis.'),
});
export type AnalyzeRobocopyLogOutput = z.infer<typeof AnalyzeRobocopyLogOutputSchema>;

export async function analyzeRobocopyLog(input: AnalyzeRobocopyLogInput): Promise<AnalyzeRobocopyLogOutput> {
  return analyzeRobocopyLogFlow(input);
}

const analyzeRobocopyLogPrompt = ai.definePrompt({
  name: 'analyzeRobocopyLogPrompt',
  input: {schema: AnalyzeRobocopyLogInputSchema},
  output: {schema: AnalyzeRobocopyLogOutputSchema},
  prompt: `You are an expert system administrator tasked with analyzing robocopy logs for potential issues.
  Your goal is to identify any errors, warnings, or other anomalies that might indicate problems during the file transfer process.

  Analyze the following robocopy log content and generate a list of alerts, categorized by severity (info, warning, error).  Provide specific, actionable messages for each alert.

  Here's the robocopy log content:
  {{logContent}}

  Ensure that the output is a valid JSON in the following format:
  {
    "alerts": [
      {
        "severity": "info" | "warning" | "error",
        "message": "A descriptive message explaining the issue."
      },
      ...
    ]
  }
`,
});

const analyzeRobocopyLogFlow = ai.defineFlow(
  {
    name: 'analyzeRobocopyLogFlow',
    inputSchema: AnalyzeRobocopyLogInputSchema,
    outputSchema: AnalyzeRobocopyLogOutputSchema,
  },
  async input => {
    const {output} = await analyzeRobocopyLogPrompt(input);
    return output!;
  }
);
