import { createKraknAgent } from "./harness/agent";

const agent = await createKraknAgent(process.cwd())
await agent.newSession()

console.log(agent.model())

agent.on('message_start', (e) => {
  if(e.message.role === "user") {
    console.log(e.message.content as string)
  }
  console.log('\n')
})

agent.on('tool_execution_end', (e) => {
  console.log(JSON.stringify(e.result))
})

agent.on('message_update', (e) => {
  const msg = e.assistantMessageEvent

  if(msg.type === 'text_start') {
    console.log('\nResult:\n')
  }

  if(msg.type === 'thinking_start') {
    console.log('\nThinking:\n')
  }

  if(msg.type === 'text_delta') {
    console.log(msg.delta)
  }

  if(msg.type === 'thinking_delta') {
    console.log(msg.delta)
  }
})

agent.prompt('Look the the web about nextjs.')