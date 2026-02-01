async function testLogin() {
    try {
        console.log('Testing login with ali@test.com...');

        const response = await fetch('http://localhost:5005/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'ali@test.com',
                password: '123456'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Login successful!');
            console.log('User:', data.user);
            console.log('Token:', data.token.substring(0, 20) + '...');
        } else {
            console.log('❌ Login failed!');
            console.log('Status:', response.status);
            console.log('Message:', data.message);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testLogin();
