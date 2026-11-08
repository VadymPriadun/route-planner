# Benchmark results

Date: 2026-11-08. Scenarios: 32 (skipped 0 with too few candidates). Groups used for ordering: 34 (size 3-9).

## A) Grouping into days (lower CV = more even days; lower radius/span = more compact days)

| Method | Avg size CV | Avg radius, m | Avg max span, m | Days with <=1 point | Avg time, ms |
| --- | --- | --- | --- | --- | --- |
| K-Means | 1.049 | 530 | 3780 | 25 | 0.14 |
| K-Means + balance | 0.979 | 641 | 4977 | 0 | 0.13 |
| DBSCAN eps=400m | 0.677 | 634 | 5386 | 3 | 0.31 |
| DBSCAN eps=700m | 0.886 | 620 | 4815 | 10 | 0.32 |
| DBSCAN eps=1000m | 0.890 | 528 | 4189 | 14 | 0.31 |

## B) Ordering within a day (open path, K-Means groups)

| Algorithm | Avg path per day, m | Over optimum, % | Avg time, ms |
| --- | --- | --- | --- |
| Random | 4624 | 40.1 | 0.002 |
| Nearest Neighbor | 3698 | 12.1 | 0.006 |
| 2-opt | 3301 | 0.0 | 0.016 |
| Optimal (brute force) | 3300 | 0.0 | 0.956 |
