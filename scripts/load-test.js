// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Ramp-up to 5 users
    { duration: '20s', target: 5 },  // Stay at 5 users
    { duration: '5s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete under 500ms
  },
};

export default function () {
  // Test search endpoint
  const searchRes = http.get('http://localhost:3000/api/search?q=frieren&type=anime');
  check(searchRes, {
    'search status was 200': (r) => r.status === 200,
    'search returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  // Test metrics scraping endpoint
  const metricsRes = http.get('http://localhost:3000/api/metrics');
  check(metricsRes, {
    'metrics status was 200': (r) => r.status === 200,
    'metrics includes custom metrics': (r) => r.body.includes('aniworld_')
  });

  sleep(0.5);
}
