"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useState } from "react";
import { Code, CrownIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import ProjectHeader from "./project-header";

const ProjectView = ({projectId} : {projectId : string}) => {
    return (
        <div className="h-screen">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                defaultSize={35}
                minSize={30}
                className="flex flex-col min-h-0"
                >
                    <ProjectHeader projectId={projectId}/>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                defaultSize={65}
                minSize={50}
                >

                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}

export default ProjectView;