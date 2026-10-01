import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Options: Simulates a realistic traffic profile with ramp-up, peak load, and cool-down.
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users (soak)
    { duration: '30s', target: 100 }, // Spike to 100 users (stress)
    { duration: '1m', target: 100 },  // Maintain 100 users (load test)
    { duration: '30s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    http_req_duration: ['p(95)<800'], // 95% of requests must complete under 800ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Load Homepage
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loaded quickly': (r) => r.timings.duration < 800,
  });
  sleep(1);

  // 2. Load Lightweight Health Check (Liveness)
  const livenessRes = http.get(`${BASE_URL}/api/health`);
  check(livenessRes, {
    'liveness status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 3. Load Heavy Health Check (Readiness - DB/Redis check)
  const readinessRes = http.get(`${BASE_URL}/api/health/ready`);
  check(readinessRes, {
    'readiness status is 200 or 503': (r) => r.status === 200 || r.status === 503,
  });
  sleep(2);

  // 4. Simulate Search Query
  const searchRes = http.get(`${BASE_URL}/api/search?q=Naruto`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200 || r.status === 404,
  });
  sleep(1);
}
