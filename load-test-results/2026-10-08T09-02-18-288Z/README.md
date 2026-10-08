# Load Test Results

- **Run at:** 2026-10-08T09:02:18.288Z
- **Endpoint:** `GET http://localhost:8000/api/orders?pageSize=100&status=CANCELLED`
- **Concurrency levels:** 5, 10, 20, 50, 100, 500
- **Durations (ms):** 1000, 2000, 5000, 10000
- **Cooldown between runs:** 2000 ms

| Concurrency | Duration_MS | Total Requests | Success % | Failure | Rate (req/sec) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 1000 | 17 | 71 | 5 | 8 |
| 5 | 2000 | 33 | 70 | 10 | 11 |
| 5 | 5000 | 74 | 68 | 24 | 9 |
| 5 | 10000 | 140 | 66 | 47 | 9 |
| 10 | 1000 | 57 | 12 | 50 | 5 |
| 10 | 2000 | 102 | 12 | 90 | 5 |
| 10 | 5000 | 254 | 9 | 230 | 4 |
| 10 | 10000 | 549 | 8 | 505 | 4 |
| 20 | 1000 | 84 | 8 | 77 | 4 |
| 20 | 2000 | 169 | 7 | 157 | 5 |
| 20 | 5000 | 397 | 5 | 379 | 3 |
| 20 | 10000 | 800 | 4 | 768 | 3 |
| 50 | 1000 | 113 | 7 | 105 | 5 |
| 50 | 2000 | 203 | 6 | 190 | 5 |
| 50 | 5000 | 450 | 4 | 431 | 3 |
| 50 | 10000 | 819 | 4 | 786 | 3 |
| 100 | 1000 | 151 | 7 | 141 | 4 |
| 100 | 2000 | 241 | 6 | 226 | 5 |
| 100 | 5000 | 471 | 4 | 451 | 3 |
| 100 | 10000 | 857 | 4 | 820 | 3 |
| 500 | 1000 | 500 | 5 | 475 | 3 |
| 500 | 2000 | 558 | 4 | 536 | 3 |
| 500 | 5000 | 638 | 3 | 617 | 2 |
| 500 | 10000 | 1035 | 3 | 1003 | 2 |

**Notes**

- *Rate* = successful (HTTP 200) requests per second.
- *Success %* = successful requests / total requests, rounded.
- A single warm-up request is sent before testing and is not counted.
