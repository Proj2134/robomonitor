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

import { analyzeRobocopyLog, type AnalyzeRobocopyLogOutput } from "@/ai/flows/intelligent-alerting";

type AlertMessage = AnalyzeRobocopyLogOutput['alerts'][0];

// Simulation data to mimic robocopy behavior
const fakeFiles = [
  { name: "drivers/", type: "dir" },
  { name: "drivers/network_card_v2.exe", size: 12.5, type: "file" },
  { name: "drivers/gpu_drivers_latest.msi", size: 350.2, type: "file" },
  { name: "assets/", type: "dir" },
  { name: "assets/logo.png", size: 0.8, type: "file" },
  { name: "assets/background.jpg", size: 2.1, type: "file" },
  { name: "project_files/main_app.exe", size: 55.0, type: "file" },
  { name: "project_files/readme.txt", size: 0.01, type: "file" },
  { name: "project_files/config.json", size: 0.02, type: "file", error: "Access is denied" },
  { name: "temp_files/", type: "dir" },
  { name: "temp_files/temp_log.tmp", size: 1.5, type: "extra" },
];

const SIMULATION_DELAY = 300; // ms between each log line

export function RoboMonitor() {
  const [source, setSource] = useState("\\\\10.255.14.149\\Desktop\\Softs");
  const [destination, setDestination] = useState("C:\\Users\\106780\\Desktop\\testing");
  const [isCopying, setIsCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState("");
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      const scrollable = logContainerRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
    }
  }, [logLines]);
  

  const generateLog = async () => {
    let fullLog = `
-------------------------------------------------------------------------------
   ROBOCOPY     ::     Robust File Copy for Windows                            
-------------------------------------------------------------------------------

  Started : ${new Date().toString()}

   Source : ${source}\\
     Dest : ${destination}\\

    Files : *.*
    
  Options : /E /V /R:3 /W:10 /LOG+:Robocopy_Log.txt /NP /ETA

------------------------------------------------------------------------------

`;
    setLogLines(fullLog.trim().split('\n'));

    for (let i = 0; i < fakeFiles.length; i++) {
      const item = fakeFiles[i];
      let logEntry = "";

      await new Promise((resolve) => setTimeout(resolve, SIMULATION_DELAY));

      if (item.type === "dir") {
        logEntry = `\t*New Dir\t\t${source}\\${item.name}`;
      } else if (item.type === 'file') {
        setCurrentFile(item.name);
        logEntry = `\tNew File\t\t${item.size} m\t${source}\\${item.name}`;
        if(item.error) {
            logEntry += `\n${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]} ERROR 5 (0x00000005) Copying File ${source}\\${item.name}\n${item.error}.`
        }
      } else if (item.type === 'extra') {
         logEntry = `\t*EXTRA File\t\t${item.size} m\t${destination}\\${item.name}`;
      }
      
      const newProgress = Math.round(((i + 1) / fakeFiles.length) * 100);
      setProgress(newProgress);
      logEntry += `\n\t${newProgress}%`;

      fullLog += logEntry + "\n";
      setLogLines(currentLines => [...currentLines, ...logEntry.split('\n')]);
    }

    const summary = `
------------------------------------------------------------------------------

               Total    Copied   Skipped  Mismatch    FAILED    Extras
    Dirs :         3         3         0         0         0         0
   Files :         7         6         0         0         1         1
   Bytes :   422.1 m   420.6 m         0         0     1.5 m   1.5 m
   Times :   0:00:15   0:00:10                       0:00:00   0:00:05


   Ended : ${new Date().toString()}
`;
    fullLog += summary;
    setLogLines(fullLog.trim().split('\n'));
    return fullLog;
  }
  
  const handleStartCopy = async () => {
    setIsCopying(true);
    setProgress(0);
    setLogLines([]);
    setCurrentFile("");
    setAlerts([]);

    const finalLog = await generateLog();

    setCurrentFile("Completed.");
    setIsCopying(false);
    
    setIsAnalyzing(true);
    try {
        const result = await analyzeRobocopyLog({ logContent: finalLog });
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
                {!isAnalyzing && alerts.length === 0 && !isCopying && (
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
