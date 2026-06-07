const fs = require('fs');
const FormData = require('form-data');
async function test() {
    try {
        const formData = new FormData();
        const filePath = '../dataset/data/train/Accident/test10_10.jpg';
        formData.append('media', fs.createReadStream(filePath));
        
        console.log('Sending request...');
        const res = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });
        const text = await res.text();
        console.log('Status code:', res.status);
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}
test();
