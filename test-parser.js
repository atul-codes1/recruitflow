require('dotenv').config({ path: '.env.local' });
const { parseTextWithAi } = require('./src/lib/parser.js');

const sampleResume = `
John Doe
johndoe@email.com | 555-123-4567 | LinkedIn: linkedin.com/in/johndoe

Summary
Highly skilled software engineer with 5 years of experience in full-stack development, specializing in React and Node.js.

Experience
Senior Developer at TechCorp (Jan 2020 - Present)
- Led the migration from Angular to React, improving load times by 40%.
- Managed a team of 3 junior developers.

Education
Bachelor of Science in Computer Science
University of Technology, 2015 - 2019

Skills
JavaScript, TypeScript, React, Node.js, SQL, Docker
`;

async function test() {
  console.log("Testing AI Parser with sample resume...");
  try {
    const result = await parseTextWithAi(sampleResume);
    console.log("\n--- RESULT ---");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
