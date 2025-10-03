"use client";

import { useState, useRef, useEffect } from "react";
import {
  Copy,
  Folder,
  Server,
  Terminal,
  CircleCheck,
  Loader2,
  Move,
  FileClock,
  FolderGit2
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
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

import { runRobocopy } from "@/app/actions";


export function RoboMonitor() {
  const [source, setSource] = useState("C:\\Users\\Default\\Documents");
  const [destination, setDestination] = useState("C:\\Temp\\Backup");
  const [operation, setOperation] = useState<'copy' | 'move'>('copy');
  const [scope, setScope] = useState<'all' | 'latest'>('all');
  const [isCopying, setIsCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState("");

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
    setCurrentFile(`Starting ${operation} process...`);
    
    try {
      const stream = await runRobocopy(source, destination, operation, scope);
      const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
      
      let lines: string[] = [];
      let currentLine = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        currentLine += value;
        const newLines = currentLine.split(/(\r\n|\n|\r)/);
        currentLine = newLines.pop() || ''; // Keep the last, possibly incomplete line

        newLines.forEach(line => {
          if (line.trim()) {
            lines.push(line.trim());
            
            // Regex to find percentage, now more specific to lines with file paths
            const progressMatch = line.match(/(\d+\.\d+%)/);
            if (progressMatch && progressMatch[0]) {
              const percent = parseFloat(progressMatch[0]);
              setProgress(percent);
            }
            
            // More reliable regex to extract file path from various Robocopy lines
            const fileMatch = line.trim().match(/(?:\s*.*)?\s*([A-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*)/i);

            if (fileMatch && fileMatch[1]) {
              const potentialPath = fileMatch[1].trim();
              // Exclude summary lines and other non-file entries
              if (potentialPath && !line.includes('----------------') && !line.includes('Log File') && !line.match(/^(?:\s*Total\s*|\s*Copied\s*|\s*Skipped\s*|\s*Mismatch\s*|\s*FAILED\s*|\s*Extras\s*)/)) {
                  setCurrentFile(potentialPath);
              }
            }
          }
        });
        
        setLogLines([...lines]);
      }

    } catch (error: any) {
        console.error("Robocopy execution failed:", error);
        toast({
            variant: "destructive",
            title: "Robocopy Error",
            description: error.message || "An unexpected error occurred during the process.",
        });
        setIsCopying(false);
        setLogLines(prev => [...prev, "ERROR: " + (error.message || "An unexpected error occurred.")]);
        return;
    }

    setProgress(100);
    setCurrentFile("Completed. Log file saved to destination.");
    setIsCopying(false);
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
            <CardDescription>Configure and initiate a new file transfer job.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
                <Label>Operation Type</Label>
                <RadioGroup
                    value={operation}
                    onValueChange={(value: 'copy' | 'move') => setOperation(value)}
                    className="flex space-x-4"
                    disabled={isCopying}
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="copy" id="r-copy" />
                        <Label htmlFor="r-copy" className="flex items-center gap-2 cursor-pointer">
                            <Copy className="h-4 w-4" /> Copy
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="move" id="r-move" />
                        <Label htmlFor="r-move" className="flex items-center gap-2 cursor-pointer">
                            <Move className="h-4 w-4" /> Move
                        </Label>
                    </div>
                </RadioGroup>
            </div>
             <Separator />
             <div className="space-y-4">
                <Label>Scope</Label>
                <RadioGroup
                    value={scope}
                    onValueChange={(value: 'all' | 'latest') => setScope(value)}
                    className="flex space-x-4"
                    disabled={isCopying}
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="r-all" />
                        <Label htmlFor="r-all" className="flex items-center gap-2 cursor-pointer">
                            <FolderGit2 className="h-4 w-4" /> All Content
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="latest" id="r-latest" />
                        <Label htmlFor="r-latest" className="flex items-center gap-2 cursor-pointer">
                            <FileClock className="h-4 w-4" /> Latest File Only
                        </Label>
                    </div>
                </RadioGroup>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="source" className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" /> Source Path
              </Label>
              <Input id="source" value={source} onChange={e => setSource(e.target.value)} disabled={isCopying} placeholder="e.g. C:\\Users\\YourUser\\Documents"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" /> Destination Path
              </Label>
              <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} disabled={isCopying} placeholder="e.g. D:\\Backups\\Docs" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold" onClick={handleStartCopy} disabled={isCopying}>
              {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (operation === 'copy' ? <Copy className="mr-2 h-4 w-4" /> : <Move className="mr-2 h-4 w-4" />)}
              {isCopying ? `${operation === 'copy' ? 'Copying' : 'Moving'}...` : `Start ${operation === 'copy' ? 'Copy' : 'Move'}`}
            </Button>
          </CardFooter>
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
                    <span className="font-semibold">{progress.toFixed(2)}%</span>
                </div>
                {isCopying && currentFile && (
                    <div className="mt-4 flex items-center text-sm">
                        <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin text-primary" />
                        <span className="font-mono text-muted-foreground truncate">
                           {currentFile}
                        </span>
                    </div>
                )}
                {!isCopying && progress === 100 && (
                    <div className="mt-4 flex items-center text-sm text-accent">
                        <CircleCheck className="h-4 w-4 mr-2 shrink-0" />
                        <span className="font-semibold">{currentFile}</span>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="flex flex-col shadow-lg h-[400px]">
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
