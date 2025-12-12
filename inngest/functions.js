import { inngest } from "./client";
import { gemini, createAgent } from "@inngest/agent-kit"
import Sandbox from "@e2b/code-interpreter"

export const callArpitBala = inngest.createFunction(
  { id: "help-arpit-bala" },
  { event: "call/aprit-bala-ai-agent" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandbox-id", async() => {
      const sandbox = await Sandbox.create("v0-nextjs-build")
      return sandbox.sandboxId;
    })
    
    // const arpitBalaAgent = createAgent({
    //   name : "arpit-bala-agent",
    //   description: "You have to come up with a relationship advice for an adult male. The age of the adult male could be between 17 to 25 years old. As the males are not getting female attention.",
    //   system: "You have to come up with ideas about how to talk to women and how to rizz them up. Throw some pickup lines and conversation starters for the males.",
    //   model: gemini({model : "gemini-2.5-flash"})
    // })

    // const {output} = await arpitBalaAgent.run("Give the most logical and helpful advice which is applicable in real world");

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await Sandbox.connect(sandboxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`
    })

    return sandboxUrl;
  }
);
