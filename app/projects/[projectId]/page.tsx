import ProjectView from "@/module/projects/components/project-view";

const Page = async ({params} : {params : Promise<{projectId : string}>}) => {
    const {projectId} = await params;

    return (
        <div>
            <ProjectView projectId={projectId}/>
        </div>
    )
}

export default Page;