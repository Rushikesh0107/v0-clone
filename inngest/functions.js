import { inngest } from "./client"
import { gemini, createAgent, createTool, createNetwork, } from "@inngest/agent-kit"
import Sandbox from "@e2b/code-interpreter"
import {PROMPT} from "@/prompt"
import lastAssistantMessageContent from "./utils"
import z, { json } from "zod";
import { MessageRole, MessageType } from "@prisma/client"
import db from "@/lib/db"

// export const callArpitBala = inngest.createFunction(
//   { id: "help-arpit-bala" },
//   { event: "call/aprit-bala-ai-agent" },
//   async ({ event, step }) => {

//     const arpitBalaAgent = createAgent({
//       name : "arpit-bala-agent",
//       description: "You have to come up with a relationship advice for an adult male. The age of the adult male could be between 17 to 25 years old. As the males are not getting female attention.",
//       system: "You have to come up with ideas about how to talk to women and how to rizz them up. Throw some pickup lines and conversation starters for the males.",
//       model: gemini({model : "gemini-2.5-flash"})
//     })

//     const {output} = await arpitBalaAgent.run("Give the most logical and helpful advice which is applicable in real world");

//     return {
//       data : output[0].content
//     };
//   }
// );

export const codeAgentFunction = inngest.createFunction(
  {id : "code-agent"},
  {event: "code-agent/run"},

  async ({event, step}) => {

    // step 1 --> Create Sandbox and get ID
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("v0-nextjs-build");
      return sandbox.sandboxId;
    })

    // step 2. --> create the AI agent and its tools.
    const codeAgent  = createAgent({
      name:"code-agent",
      desciption:"An expert coding agent.",
      system:PROMPT,
      model:gemini({model : "gemini-2.5-flash"}),
      tools:[

        // 1. Terminal
        createTool({
          name:"terminal",
          desciption:"Use the terminal to run the commmands",
          parameters:z.object({
            command:z.string()
          }),
          handler:async({terminal}, {step}) => {
            return await step?.run("terminal ",async() => {
              const buffer = {stdout:"", stderr:""};

              try {
                const sandbox = await Sandbox.connect(sandboxId);

                const result = await sandbox.commands.run(command, {
                  onStdout : (data) => {
                    buffer.stdout += data;
                  },

                  onStderr: (data) => {
                    buffer.stderr += data;
                  }
                })

                return result.stdout;

              } catch (error) {
                console.log(`Command failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`)
                return `Command failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`
              }
            })
          }
        }),

        // 2. Create Update files.
        createTool({
          name:"createOrUpadteFiles",
          description:"Create or update files in the sandbox",
          parameters:z.object({
            files:z.array(
              z.object({
                path:z.string(),
                content:z.string()
              })
            )
          }),
          handler:async({files}, {step, network}) => {
            const newFiles = step.run("createOrUpdateFiles", async() => {
              try {
                const updatedFiles = network?.state?.data?.files || {}
                const sandbox = await Sandbox.connect(sandboxId)
                for(const file of files){
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file] = file.content;
                }
                return updatedFiles
              }catch (error){
                return "Error" + error
              }
            })
            if(typeof newFiles === "object"){
              network.state.data.files = newFiles;
            }
          }
        }),

        // 3. readFiles
        createTool({
          name:"readFiles",
          description:"Read files in the sandbox",
          parameters:z.object({
            files:z.array(z.string())
          }),
          handler:async({files}, {step})=>{

            return await step?.run("readFiles",async()=>{
              try {
                const sandbox = await Sandbox.connect(sandboxId)

                const contents = [];

                for(const file of files){
                  const content = await sandbox.files.read(file);
                  contents.push({path:file, content});
                }

                return JSON.stringify(contents)
              } catch (error) {
                return "Error " + error
              }
            })
          }
        })
      ],

      lifecycle: {
        onResponse: async ({result, network}) => {
          const lastAssistantMessageText = lastAssistantMessageContent(result);

          if(lastAssistantMessageText && network){
            if(lastAssistantMessageText.includes("<task_summary>")){
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        }
      }
    });


    const network = createNetwork({
      name:"coding-agent-network",
      agents:[codeAgent],
      maxIter: 10,

      router: async({network}) => {
        const summary = await network.state.data.summary;

        if(summary){
          return;
        }

        return codeAgent;
      }
    })


    const result = await network.run(event.data.value)

    const isError = !result.state.data.summary || Object.keys(result.state.data.summary || {}).length === 0;

    //step 3 --> get sandboxUrl 
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await Sandbox.connect(sandboxId);
      const host = sandbox.getHost(3000)
      return `http://${host}`
    })

    await step.run("save-result", async () => {
      if(isError){
        return await db.message.create({
          data:{
            projectId:event.data.projectId,
            content:"Something went wrong. Please try again",
            role:MessageRole.ASSISTANT,
            type:MessageType.ERROR
          }
        })
      }

      return await db.message.create({
        data:{
          projectId:event.data.projectId,
          content:result.state.data.summary,
          role:MessageRole.ASSISTANT,
          type:MessageType.RESULT,
          fragments: {
            create: {
              sandboxUrl:sandboxUrl,
              title:"Untitled",
              files: result.state.data.files,
            }
          }
        }
      })
    })

    return {
      url: sandboxUrl,
      title:"Untitled",
      files: result.state.data.files,
      summary: result.state.data.summary,
    }
  } 
)
