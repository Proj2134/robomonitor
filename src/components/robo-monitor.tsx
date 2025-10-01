"use client";

import { useState, useRef, useEffect } from "react";
import {
  Copy,
  Folder,
  File as FileIcon,
  Server,
  Terminal,
  AlertTriangle,
  CircleCheck,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

import { analyzeRobocopyLog, type AnalyzeRobocopyLogOutput } from "@/ai/flows/intelligent-alerting";

type AlertMessage = AnalyzeRobocopyLogOutput['alerts'][0];

// --- Simulation Logic ---
const FAKE_FILES = [
    "system/drivers/ntfs.sys",
    "system/drivers/tcpip.sys",
    "documents/quarterly_report_q3.docx",
    "documents/project_alpha/gantt_chart.xlsx",
    "videos/family_vacation_2023.mp4",
    "videos/archive/conference_talk.mov",
    "source/app/main.py",
    "source/app/utils/helpers.py",
    "source/app/tests/test_main.py",
    "backups/db_backup_2023_10_26.sql",
    "design/assets/logo_final.svg",
    "design/assets/icon_set/user.svg",
    "design/assets/icon_set/settings.svg",
    "temp/some_random_file.tmp",
    "temp/another_file.log"
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function* generateLog(source: string, destination: string) {
    yield `-------------------------------------------------------------------------------
   ROBOCOPY     ::     Robust File Copy for Windows
-------------------------------------------------------------------------------

  Started : ${new Date().toString()}

   Source : ${source}
     Dest : ${destination}

    Files : *.*

  Options : *.* /S /E /V /R:3 /W:10 /NP /ETA

------------------------------------------------------------------------------`;

    for (let i = 0; i < FAKE_FILES.length; i++) {
        const file = FAKE_FILES[i];
        const progress = Math.round(((i + 1) / FAKE_FILES.length) * 100);
        yield `\t*EXTRA File\t\t      1.2 m\t${file.replace(/\//g, '\\')}`;
        await sleep(150);
        yield `\t\t${progress}%`; // This simulates the percentage update line
    }

    yield `
------------------------------------------------------------------------------

               Total    Copied   Skipped  Mismatch    FAILED    Extras
    Dirs :         5         5         0         0         0         0
   Files :        15        15         0         0         0         0
   Bytes :   145.3 m   145.3 m         0         0         0         0
   Times :   0:00:05   0:00:02                       0:00:00   0:00:02

   Ended : ${new Date().toString()}`;
}
// --- End Simulation Logic ---


export function RoboMonitor() {
  const [source, setSource] = useState("\\\\SERVER01\\Share\\Softs");
  const [destination, setDestination] = useState("D:\\Backups\\Software");
  const [isCopying, setIsCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState("");
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (logContainerRef.current) {
      const scrollable = logContainerRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
    }
  }, [logLines]);

  const handleStartCopy = async () => {
    setIsCopying(true);
    setProgress(0);
    setLogLines([]);
    setCurrentFile("Starting copy process...");
    setAlerts([]);

    let fullLog = "";
    
    try {
        const logGenerator = generateLog(source, destination);
        for await (const line of logGenerator) {
            
            const progressMatch = line.match(/^\s*(\d+)%$/);
            if (progressMatch) {
                const newProgress = parseInt(progressMatch[1], 10);
                setProgress(newProgress);
            } else {
                 const fileMatch = line.match(/\t(.*)$/);
                 if (fileMatch && !fileMatch[1].includes('%')) {
                    setCurrentFile(fileMatch[1].trim());
                 }
                setLogLines(prev => [...prev, line]);
                fullLog += line + '\n';
            }
        }
    } catch (error: any) {
        console.error("Simulation failed:", error);
        toast({
            variant: "destructive",
            title: "Simulation Error",
            description: "An unexpected error occurred during the simulation.",
        });
        setIsCopying(false);
        return;
    }


    setProgress(100);
    setCurrentFile("Completed.");
    setIsCopying(false);
    
    setIsAnalyzing(true);
    try {
        const result = await analyzeRobocopyLog({ logContent: fullLog });
        setAlerts(result.alerts);
    } catch (error) {
        console.error("AI analysis failed:", error);
        setAlerts([{ severity: 'error', message: 'Failed to analyze log file.' }]);
    }
    setIsAnalyzing(false);
  };
  
  const getAlertIcon = (severity: AlertMessage['severity']) => {
    const iconProps = { className: "h-5 w-5" };
    switch (severity) {
      case 'error':
        return <AlertTriangle {...iconProps} />;
      case 'warning':
        return <Info {...iconProps} />;
      case 'info':
        return <CircleCheck {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Copy className="text-primary" />
              Robocopy Job
            </CardTitle>
            <CardDescription>Configure and initiate a new file copy job.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source" className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" /> Source Path
              </Label>
              <Input id="source" value={source} onChange={e => setSource(e.target.value)} disabled={isCopying} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" /> Destination Path
              </Label>
              <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} disabled={isCopying} />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold" onClick={handleStartCopy} disabled={isCopying}>
              {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              {isCopying ? "Copying..." : "Start Copy"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <Sparkles className="text-primary" />
                    Intelligent Alerts
                </CardTitle>
                <CardDescription>AI-powered analysis of the copy log.</CardDescription>
            </CardHeader>
            <CardContent>
                {isAnalyzing && (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span className="text-muted-foreground">Analyzing log...</span>
                    </div>
                )}
                {!isAnalyzing && alerts.length === 0 && (logLines.length === 0 || progress !== 100) &&(
                    <div className="text-center text-sm text-muted-foreground p-4">
                        No alerts to show. Run a job to analyze its log.
                    </div>
                )}
                <div className="space-y-3">
                    {alerts.map((alert, index) => (
                        <Alert key={index} variant={alert.severity === 'error' ? 'destructive' : 'default'} className="flex items-start gap-3">
                            {getAlertIcon(alert.severity)}
                            <div className="flex-1">
                                <AlertTitle className="capitalize font-semibold">{alert.severity}</AlertTitle>
                                <AlertDescription>{alert.message}</AlertDescription>
                            </div>
                        </Alert>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
      
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline">Progress</CardTitle>
                <CardDescription>Live progress of the file transfer.</CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={progress} className="w-full mb-2 h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Overall Progress</span>
                    <span className="font-semibold">{progress}%</span>
                </div>
                {isCopying && currentFile && (
                    <div className="mt-4 flex items-center text-sm">
                        <FileIcon className="h-4 w-4 mr-2 shrink-0 text-primary" />
                        <span className="font-mono text-muted-foreground truncate">
                           {currentFile}
                        </span>
                    </div>
                )}
                {!isCopying && progress === 100 && (
                    <div className="mt-4 flex items-center text-sm text-accent">
                        <CircleCheck className="h-4 w-4 mr-2 shrink-0" />
                        <span className="font-semibold">Copy operation completed successfully.</span>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col shadow-lg min-h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Terminal />
              Live Log
            </CardTitle>
            <CardDescription>Raw output from the robocopy process.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 bg-secondary/30 dark:bg-black/30 rounded-md border" ref={logContainerRef}>
              <div className="p-4 font-mono text-xs">
                {logLines.map((line, index) => (
                  <p key={index} className="whitespace-pre-wrap leading-relaxed">{line}</p>
                ))}
                {isCopying && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
