import axios from 'axios';

// Test Admin Login
console.log('🔵 Testing Admin Login...');
axios.post('http://127.0.0.1:8000/api/login', {
  email: 'admin@agency.com',
  password: 'Admin123!'
})
.then(res => {
  console.log('✅ Admin Login Success:', res.data);
  console.log('Admin Role:', res.data.user.role);
  console.log('Admin Token:', res.data.token.substring(0, 20) + '...');
})
.catch(err => {
  console.error('❌ Admin Login Failed:', err.response?.data || err.message);
});

// Test Staff Login
console.log('\n🟡 Testing Staff Login...');
axios.post('http://127.0.0.1:8000/api/login', {
  email: 'staff@agency.com',
  password: 'Staff123!'
})
.then(res => {
  console.log('✅ Staff Login Success:', res.data);
  console.log('Staff Role:', res.data.user.role);
  console.log('Staff Token:', res.data.token.substring(0, 20) + '...');
})
.catch(err => {
  console.error('❌ Staff Login Failed:', err.response?.data || err.message);
  console.error('Status Code:', err.response?.status);
  console.error('Full Error:', err);
});
