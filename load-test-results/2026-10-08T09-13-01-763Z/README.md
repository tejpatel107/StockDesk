# Load Test Results

- **Run at:** 2026-10-08T09:13:01.763Z
- **Endpoint:** `GET http://localhost:8000/api/orders?pageSize=100&status=CANCELLED`
- **Concurrency levels:** 5, 10, 20, 50, 100, 500
- **Durations (ms):** 1000, 2000, 5000, 10000
- **Cooldown between runs:** 2000 ms

| Concurrency | Duration_MS | Total Requests | Success % | Failure | Rate (req/sec) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 1000 | 10 | 100 | 0 | 8 |
| 5 | 2000 | 19 | 100 | 0 | 7 |
| 5 | 5000 | 60 | 100 | 0 | 11 |
| 5 | 10000 | 125 | 100 | 0 | 12 |
| 10 | 1000 | 19 | 100 | 0 | 13 |
| 10 | 2000 | 25 | 100 | 0 | 11 |
| 10 | 5000 | 67 | 100 | 0 | 12 |
| 10 | 10000 | 148 | 100 | 0 | 14 |
| 20 | 1000 | 20 | 100 | 0 | 10 |
| 20 | 2000 | 35 | 100 | 0 | 13 |
| 20 | 5000 | 64 | 100 | 0 | 11 |
| 20 | 10000 | 111 | 100 | 0 | 10 |
| 50 | 1000 | 50 | 100 | 0 | 9 |
| 50 | 2000 | 53 | 100 | 0 | 8 |
| 50 | 5000 | 103 | 100 | 0 | 13 |
| 50 | 10000 | 167 | 100 | 0 | 13 |
| 100 | 1000 | 102 | 84 | 16 | 13 |
| 100 | 2000 | 113 | 86 | 16 | 14 |
| 100 | 5000 | 157 | 87 | 20 | 13 |
| 100 | 10000 | 238 | 77 | 55 | 12 |
| 500 | 1000 | 500 | 19 | 407 | 12 |
| 500 | 2000 | 670 | 14 | 574 | 13 |
| 500 | 5000 | 549 | 22 | 430 | 11 |
| 500 | 10000 | 1045 | 18 | 857 | 12 |

**Notes**

- *Rate* = successful (HTTP 200) requests per second.
- *Success %* = successful requests / total requests, rounded.
- A single warm-up request is sent before testing and is not counted.
