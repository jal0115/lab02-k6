import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 30, duration: "1m" };

export default function () {
  const res = http.get('http://localhost:3000/slow');
  check(res, { 'status 200 байна': (r) => r.status === 200 });
  sleep(1);
}

