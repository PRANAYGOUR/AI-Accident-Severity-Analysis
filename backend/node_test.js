const { exec } = require('child_process');
const pythonScript = 'c:/Users/Pranay Gour/OneDrive/Desktop/AI Accident Severity Analysis/ml/analyze.py';
const filePath = 'c:/Users/Pranay Gour/OneDrive/Desktop/AI Accident Severity Analysis/backend/uploads/1775808729526.jpg';

exec(`python "${pythonScript}" "${filePath}"`, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    console.log('Error:', err);
    console.log('STDOUT:');
    console.log(stdout);
    console.log('STDERR:');
    console.log(stderr);
});
