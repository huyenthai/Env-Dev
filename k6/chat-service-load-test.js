import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  scenarios: {
    signup_and_send_chat: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 200,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

const receiverIds = ['1', '2', '1002']; 
const messages = ['Hello', 'Test123', 'Hey there', 'What’s up?', 'Quick ping'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function setup() {
  const tokens = [];

  for (let i = 1; i <= 100; i++) {
    const email = `user${i}@loadtest.com`;
    const password = 'Test123';
    const username = `User${i}`;

    // Sign up
    const signupRes = http.post('http://localhost:5000/api/auth/signup', JSON.stringify({
      email, password, username
    }), { headers: { 'Content-Type': 'application/json' } });

    check(signupRes, {
      'signup successful or already exists': (res) => res.status === 200 || res.status === 400,
    });

    // Login
    const loginRes = http.post('http://localhost:5000/api/auth/login', JSON.stringify({
      email, password
    }), { headers: { 'Content-Type': 'application/json' } });

    check(loginRes, { 'login successful': (res) => res.status === 200 });

    const token = loginRes.json('token');
    tokens.push(token);
  }

  return { tokens };
}

export default function (data) {
  const token = data.tokens[__VU - 1]; // each VU uses its own token

  const chatPayload = JSON.stringify({
    receiverId: randomItem(receiverIds),
    message: randomItem(messages),
    messageType: Math.random() < 0.8 ? 'text' : 'image',
    blobName: ''
  });

  const chatHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const chatRes = http.post('http://localhost:5002/api/chat/send', chatPayload, chatHeaders);
  check(chatRes, { 'message sent': (r) => r.status === 200 });

  sleep(1);
}
