import axios from 'axios';

axios.post('http://127.0.0.1:8000/api/login', {
  email: 'admin@agency.com',
  password: 'Admin123!'
})
.then(res => {
  console.log(res.data);
})
.catch(err => {
  console.error(err.response.data);
});
