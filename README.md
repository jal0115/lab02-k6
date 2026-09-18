# Lab 02 — Гүйцэтгэлийн хэмжүүрийг k6-аар хэмжих

* **Оюутны нэр:** Г. Лувсанжал
* **Оюутны код:** B242270016

---

## 1. k6 хувилбар

```bash
$ k6 version
k6 v2.2.0 (commit/00a9a1b7f5, go1.26.5, linux/amd64)
```

## Тестийн байг

- `https://test.k6.io` — зааврын дадлагын сайт (5/30/100 VU, stages, threshold тестүүд)
- `http://localhost:3000` — локал Express сервер (`/fast`, `/slow` endpoint)

---

## 2. Baseline тест (Алхам 2)

Анхны 5 VU-ийн тестийн бүтэн гаралт: `results/run-05vu.txt`, дэлгэцний зураг: `screenshots/run-05vu.png`

**Baseline p95 = 309.14ms** — энэ утга дараа SLO-г тооцоход ашиглагдана (доор 5-р хэсэгт).

---

## 3. Ачааллын түвшин 5 → 30 → 100 VU (тус тусад нь ажиллуулсан)

| VU | p90 | p95 | Throughput | Error rate | Файл |
|---|---|---|---|---|---|
| **5 VU** | 308.48ms | **309.14ms** | 6.77 req/s (210 нийт) | 0.00% | `results/run-05vu.txt` |
| **30 VU** | 226.78ms | **227.35ms** | 45.49 req/s (2760 нийт) | 0.00% | `results/run-30vu.txt` |
| **100 VU** | 226.4ms | **227.12ms** | 151.12 req/s (9260 нийт) | 0.00% | `results/run-100vu.txt` |

Screenshots: `screenshots/run-30vu.png`, `screenshots/run-100vu.png`

**Тайлбар:** Дээрх гурван мөр тус бүр `script.js`-ийг тусдаа ажиллуулалтаар (5/30/100 VU тус бүрийг тусдаа `k6 run` командаар) авсан бодит хэмжилт. `stages`-тэй нэг ажиллуулалт нэгтгэсэн ганц summary өгдөг тул хүснэгтийн эх сурвалж болгон ашиглагдаагүй.

---

## 4. Stages туршилт (5→30→100→0 тасралтгүй ачаалал)

`script-stages.js`-ийг ашиглан ачааллыг тасралтгүй 5-аас 100 VU хүртэл өсгөж, дараа нь 0 хүртэл бууруулах туршилт хийв:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
};
```

| Хэмжүүр | Утга |
|---|---|
| p90 | 227.07ms |
| p95 | 230.16ms |
| Throughput | 46.99 req/s (7064 нийт) |
| Error rate | 0.00% |

Файл: `results/run-stages.txt`, Screenshot: `screenshots/run-stages.png`

---

## 5. SLO (Threshold) — PASS ба FAIL

### SLO-гийн сонголтын тайлбар

Baseline (5 VU, Алхам 2) p95 = **309.14ms**. SLO-г зааврын жишээ тоог хуулбарлахын оронд өөрийн baseline дээр үндэслэн дараах томьёогоор гаргав:

```
SLO = baseline_p95 × 1.5 = 309.14 × 1.5 ≈ 464ms
```

### A. PASS

```javascript
export const options = {
  vus: 30, duration: "1m",
  thresholds: {
    http_req_duration: ['p(95)<464'],
    http_req_failed: ['rate<0.01'],
  },
};
```
Гаралт (`results/run-thresholds-pass.txt`):
```
✓ 'p(95)<464' p(95)=229.75ms
✓ 'rate<0.01' rate=0.00%
```
Screenshot: `screenshots/threshold-pass.png`

### B. FAIL

```javascript
export const options = {
  vus: 30, duration: "1m",
  thresholds: {
    http_req_duration: ['p(95)<10'],
    http_req_failed: ['rate<0.01'],
  },
};
```
Гаралт (`results/run-thresholds-fail.txt`):
```
✗ 'p(95)<10' p(95)=230.12ms
✓ 'rate<0.01' rate=0.00%
ERRO[0061] thresholds on metrics 'http_req_duration' have been crossed
```
Screenshot: `screenshots/threshold-fail.png`

Хоёр script (`script-threshold-pass.js`, `script-threshold-fail.js`) хоёулаа repo-д commit хийгдсэн — README-д бичсэн threshold бүр кодтой яг таарч байна.

---

## 6. Локал сервер (network variance-гүй харьцуулалт)

`test.k6.io`-ийн үр дүнд network noise хэр нөлөөлж байгааг шалгахын тулд локал Express сервер ашиглан харьцуулалт хийв:

```javascript
app.get('/fast', (req, res) => {
  res.json({ status: 'ok', type: 'fast' });
});

app.get('/slow', (req, res) => {
  setTimeout(() => {
    res.json({ status: 'ok', type: 'slow' });
  }, 100);
});
```

| Endpoint | p90 | p95 | Throughput | Файл |
|---|---|---|---|---|
| `/fast` | 6.36ms | **7.76ms** | 29.87 req/s | `results/run-local-fast.txt` |
| `/slow` | 106.12ms | **107.16ms** | 27.16 req/s | `results/run-local-slow.txt` |

Screenshots: `screenshots/run-local-fast.png`, `screenshots/run-local-slow.png`

`/fast` болон `/slow`-ийн p95 зөрүү (~99.4ms) нь кодод оруулсан `setTimeout(100)`-той нарийн таарч байгаа тул энэ хэмжилт network noise-гүй, зөвхөн server-side latency-г цэвэр харуулж байна.

---

## 7. Дүгнэлт

Энэхүү лабораторийн ажлаар k6 хэрэгслээр `test.k6.io` сайтын гүйцэтгэлийг 5, 30, 100 VU гэсэн гурван түвшинд, мөн 5→30→100→0 тасралтгүй stages горимоор хэмжив. Ачаалал 5 VU-с 30, 100 VU болж өсөхөд p95 latency 309.14ms-с 227ms орчим болж буурсан нь эхлээд гайхмаар мэт санагдсан ч, шалтгаан нь `test.k6.io` серверийн өндөр хүчин чадал, эхний ажиллуулалтын TLS/DNS зардал, мөн интернетийн сүлжээний хэлбэлзэл (network variance) байж болзошгүй гэж дүгнэв. Энэ таамаглалыг шалгахын тулд локал Express сервер ашиглан network noise-гүй орчинд `/fast` болон `/slow` endpoint-ийг харьцуулахад, кодод оруулсан яг 100ms-тай нарийн таарсан зөрүү (7.76ms → 107.16ms) ажиглагдсан нь сервер талын боловсруулалтын хугацаа load-той шууд хамааралтай болохыг батлав. Throughput нь ачаалал өсөх тусам шугаман байдлаар өссөн (6.77 → 45.49 → 151.12 req/s), энэ нь `test.k6.io` серверт тестэлсэн хэмжээнд хараахан хүчин чадлын хязгаарт хүрч чадаагүйг илтгэнэ. Бүх ажиллуулалтын турш error rate 0.00% байсан нь тестэлсэн ачааллын хэмжээнд алдаа гарган зогсох цэгт хараахан хүрээгүйг харуулж байна. SLO-г эхний baseline (5 VU) p95 = 309.14ms дээр үндэслэн ×1.5 = 464ms гэж тодорхойлсноор, 30 VU-ийн бодит p95 (229.75ms) хэмжээгээр амархан PASS болов. FAIL нөхцлийг харуулахын тулд threshold-ыг санаатайгаар `p(95)<10` болгож хатууруулахад, бодит p95 (230.12ms) хэтэрсэн тул `ERRO` мессежтэйгээр амжилтгүй болсон нь k6-ийн threshold механизм CI/CD орчинд quality gate болж ажиллах жишээг тодорхой харуулав. Stages горимоор ачааллыг тасралтгүй өсгөж бууруулахад p95 (230.16ms) нь тусдаа 30/100 VU ажиллуулалтуудтай нийцтэй байсан нь тестийн үр дүнгийн тогтвортой байдлыг баталгаажуулав. Ерөнхийдөө энэ лабораторийн ажил нь latency (p95), throughput, error rate гэсэн гурван үндсэн хэмжүүрийг бодит хэрэгслээр хэмжиж, тэдгээрийг хэрхэн уншиж, SLO болгон ашиглахыг ойлгоход тустай туршлага болов.

---

## Ажиллуулах заавар

```bash
# k6 суулгах (Debian/Ubuntu)
sudo apt install k6

# Baseline болон ачааллын түвшин
k6 run script.js | tee results/run-05vu.txt
k6 run --vus 30 --duration 1m script.js | tee results/run-30vu.txt
k6 run --vus 100 --duration 1m script.js | tee results/run-100vu.txt

# Stages
k6 run script-stages.js | tee results/run-stages.txt

# Threshold PASS/FAIL
k6 run script-threshold-pass.js | tee results/run-thresholds-pass.txt
k6 run script-threshold-fail.js | tee results/run-thresholds-fail.txt

# Локал сервер (өөр terminal дээр node local-server/server.js ажиллуулсны дараа)
k6 run script-local.js | tee results/run-local-fast.txt   # /fast URL-тай үед
k6 run script-local.js | tee results/run-local-slow.txt   # /slow URL-тай үед
```
