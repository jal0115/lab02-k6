import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    // Жишээ нь: 95% хүсэлтийн хугацаа 564ms-ээс бага байх ёстой (PASS болох босго)
    http_req_duration: ['p(95) < 10'],
    // Алдааны хувь 1%-аас бага байх ёстой
    http_req_failed: ['rate < 0.01'],
  },
};

export default function () {
  const res = http.get('https://test.k6.io');
  check(res, { 'status 200 байна': (r) => r.status === 200 });
  sleep(1);
}
