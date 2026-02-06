const fetch = require('node-fetch');

async function testStages() {
  console.log('🧪 Testing Stage-Based Interview System\n');
  
  const tests = [
    {
      name: 'Frontend Developer',
      payload: {
        resumeText: 'React Developer with 2 years experience building SPAs',
        jobDescription: 'Frontend Developer position at startup',
        questionIndex: 0,
        questionCount: 5
      }
    },
    {
      name: 'Backend Developer',
      payload: {
        resumeText: 'Backend Engineer with Node.js and Python experience',
        jobDescription: 'Backend Developer role working with APIs',
        questionIndex: 0,
        questionCount: 5
      }
    },
    {
      name: 'Product Company (Google)',
      payload: {
        resumeText: 'Full Stack Developer with system design experience',
        jobDescription: 'Software Engineer at Google',
        questionIndex: 0,
        questionCount: 5
      }
    }
  ];

  for (const test of tests) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch('http://localhost:5000/api/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.payload)
      });

      const data = await response.json();
      
      console.log(`✅ Detected Role: ${data.detectedRole}`);
      console.log(`📊 Generated ${data.totalQuestions} questions`);
      console.log(`\n🎯 Interview Sequence: ${data.sequence.join(' → ')}`);
      console.log('\n📝 Questions:');
      
      data.qaPairs.forEach((qa, idx) => {
        console.log(`\n  ${idx + 1}. [${qa.stage}] ${qa.question}`);
        console.log(`     💡 ${qa.direction}`);
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ All tests completed!');
}

testStages().catch(console.error);
