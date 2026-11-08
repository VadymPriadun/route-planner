# Benchmark results

Date: 2026-11-07. Scenarios: 32 (skipped 0 with too few candidates). Groups used for ordering: 22 (size 3-9).

## A) Grouping into days (lower CV = more even days; lower radius/span = more compact days)

| Method | Avg size CV | Avg radius, m | Avg max span, m | Days with <=1 point | Avg time, ms |
| --- | --- | --- | --- | --- | --- |
| K-Means | 1.018 | 488 | 2859 | 36 | 0.06 |
| K-Means + balance | 0.956 | 612 | 4336 | 0 | 0.05 |
| DBSCAN eps=400m | 0.659 | 589 | 4152 | 4 | 0.12 |
| DBSCAN eps=700m | 0.868 | 484 | 3140 | 23 | 0.15 |
| DBSCAN eps=1000m | 0.868 | 484 | 3140 | 23 | 0.15 |

## B) Ordering within a day (open path, K-Means groups)

| Algorithm | Avg path per day, m | Over optimum, % | Avg time, ms |
| --- | --- | --- | --- |
| Random | 3372 | 39.2 | 0.002 |
| Nearest Neighbor | 2656 | 9.7 | 0.005 |
| 2-opt | 2424 | 0.1 | 0.022 |
| Optimal (brute force) | 2422 | 0.0 | 1.084 |
