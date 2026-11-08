# Benchmark results

Date: 2026-11-08. Scenarios: 32 (skipped 0 with too few candidates). Groups used for ordering: 20 (size 3-9).

## A) Grouping into days (lower CV = more even days; lower radius/span = more compact days)

| Method | Avg size CV | Avg radius, m | Avg max span, m | Days with <=1 point | Avg time, ms |
| --- | --- | --- | --- | --- | --- |
| K-Means | 1.028 | 507 | 2842 | 35 | 0.09 |
| K-Means + balance | 0.859 | 698 | 4590 | 0 | 0.09 |
| DBSCAN eps=400m | 0.699 | 600 | 4189 | 8 | 0.14 |
| DBSCAN eps=700m | 0.924 | 497 | 3223 | 22 | 0.19 |
| DBSCAN eps=1000m | 0.924 | 497 | 3223 | 22 | 0.18 |

## B) Ordering within a day (open path, K-Means groups)

| Algorithm | Avg path per day, m | Over optimum, % | Avg time, ms |
| --- | --- | --- | --- |
| Random | 3320 | 30.9 | 0.005 |
| Nearest Neighbor | 2640 | 4.1 | 0.008 |
| 2-opt | 2536 | 0.0 | 0.025 |
| Optimal (brute force) | 2536 | 0.0 | 0.761 |
