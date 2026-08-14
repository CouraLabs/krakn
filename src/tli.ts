import { createKraknAgent } from "./harness/agent";

const agent = createKraknAgent(process.cwd())
await agent.newSession()

agent.switchThinkingLevel('high')

let message_update_text_start = -1
let message_update_thinking_start = -1

agent.on('message_start', (e) => {
  if(e.message.role === 'assistant') {

  }

  if(e.message.role === 'user') {
    
  }

  if(e.message.role === 'toolResult') {
    
  }
})

agent.on('agent_end', (e) => {
  const ctx = agent.getContext();
  process.exit(0)
  //console.log(ctx)
})

// agent.on('message_start', (e) => {
//   if(e.message.role === "user") {
//     console.log(e.message.content as string)
//   }
//   console.log('\n')
// })

// agent.on('tool_execution_end', (e) => {
//   console.log(JSON.stringify(e.result))
// })

// agent.on('message_update', (e) => {
//   if(e.message.role === "assistant")
//     console.log(e.message.diagnostics)  
// })

agent.prompt('Hi who are you? Write a file text.txt, then edit it 5 times, diffrentely')
