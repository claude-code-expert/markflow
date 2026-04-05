<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


## Meta Rules                                                                 
  **On recurring issues**: Do not simply retry. Always read the relevant source code first, identify the root cause, then respond.

  **After session restart**: After `/compact` completes or a new session starts, always re-read this file first to restore the project context.



 ### Response Format After Task Completion                                
                                               
  After completing a task, always summarize the following in Korean:                                                                                                                             
   
  1. **What was changed**                                                                                                                                                                        
  2. **Why it was done that way**                                 
  3. **Any caveats or things to watch out for**   