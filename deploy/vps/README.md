# VPS cron

The morning, evening and weekly jobs run from cron on `root@162.243.213.122`
(DigitalOcean, Ubuntu 24.04, hostname `oracle-vps`). They moved off GitHub Actions on
2026-11-20, because GitHub ran the scheduled "6 AM" morning job between 12:30 and 3 PM ET,
after the open, while the simulator fills every trade at the 9:30 open.

| Job | When (ET) | What |
|---|---|---|
| morning | 9:00 AM Mon–Fri | `generate.py` → daily summary → leaderboard participation → push |
| late | 10:00 AM Mon–Fri | `generate.py --experiment late` (timing experiment's second run) → push |
| evening | 5:30 PM Mon–Fri | `score.py` → `experiments.py` (settle the timing experiment) → daily summary (`--force`) → `analytics.py` → push |
| weekly | 10:00 AM Sat | `summarize.py --weekly` → push |

The VPS pushes to master with its own deploy key, and that push triggers
`.github/workflows/deploy.yml`, which builds and publishes Pages. The three cron
workflows are disabled in GitHub (`gh workflow disable`), not deleted, so they remain
a fallback: `gh workflow enable morning.yml` turns one back on.

The same box runs the separate market-oracle-v2 Docker stack. This setup does not touch it.

## Layout on the VPS

```
/opt/ai-market-oracle/
  repo/            clone of aamilonas/ai-market-oracle (bot identity, pushes via deploy key)
  venv/            Python 3.12 venv with requirements.txt
  .env             OPENROUTER_API_KEY (+ FRED_API_KEY if added), mode 600
  bin/run-job.sh   copy of deploy/vps/run-job.sh
/etc/cron.d/ai-market-oracle          copy of deploy/vps/ai-market-oracle.cron
/var/log/ai-market-oracle/            one log per job per day, plus history.log
/root/.ssh/ai_market_oracle_deploy    deploy key (repo Settings → Deploy keys, read-write)
/root/.ssh/config                     Host alias github-ai-market-oracle → that key
```

The box's clock is UTC, and Ubuntu cron has no `CRON_TZ`. Each cron line therefore fires
at both the EDT and the EST UTC hour, and `run-job.sh --at HH` exits unless the
America/New_York hour is `HH`. DST is handled without changing the system timezone.

## Everyday ops

```bash
ssh root@162.243.213.122
tail -20 /var/log/ai-market-oracle/history.log        # OK / FAILED per run
less /var/log/ai-market-oracle/$(date +%F)-morning.log

# Manual runs (args go to the main script, same as the old workflow_dispatch inputs)
/opt/ai-market-oracle/bin/run-job.sh morning --dry-run
/opt/ai-market-oracle/bin/run-job.sh morning --models qwen-3-8-max --overwrite
/opt/ai-market-oracle/bin/run-job.sh late --dry-run
/opt/ai-market-oracle/bin/run-job.sh evening --date 2026-11-20
/opt/ai-market-oracle/bin/run-job.sh weekly --week 2026-W47 --force
```

Jobs share a lock, so a manual run waits for a scheduled one instead of colliding with it.
The job runs `git pull` itself before it starts, so code pushed to master is picked up on
the next run. If `requirements.txt` changes, run
`/opt/ai-market-oracle/venv/bin/pip install -r /opt/ai-market-oracle/repo/requirements.txt`.

## Updating these files

After editing `run-job.sh` or the cron file in the repo:

```bash
scp deploy/vps/run-job.sh root@162.243.213.122:/opt/ai-market-oracle/bin/run-job.sh
scp deploy/vps/ai-market-oracle.cron root@162.243.213.122:/etc/cron.d/ai-market-oracle
ssh root@162.243.213.122 'sed -i "s/\r$//" /opt/ai-market-oracle/bin/run-job.sh /etc/cron.d/ai-market-oracle; chmod 755 /opt/ai-market-oracle/bin/run-job.sh; chmod 644 /etc/cron.d/ai-market-oracle'
```

(The `sed` strips Windows line endings; cron silently ignores a file that contains them.)

## Rebuilding from scratch

```bash
apt-get install -y python3.12-venv
mkdir -p /opt/ai-market-oracle/bin /var/log/ai-market-oracle
ssh-keygen -t ed25519 -N "" -f /root/.ssh/ai_market_oracle_deploy
#  add the .pub as a read-write deploy key:  gh repo deploy-key add <pub> --allow-write
printf '\nHost github-ai-market-oracle\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/ai_market_oracle_deploy\n  IdentitiesOnly yes\n' >> /root/.ssh/config
git clone git@github-ai-market-oracle:aamilonas/ai-market-oracle.git /opt/ai-market-oracle/repo
git -C /opt/ai-market-oracle/repo config user.name  "AI Market Oracle Bot"
git -C /opt/ai-market-oracle/repo config user.email "bot@ai-market-oracle.github.io"
python3 -m venv /opt/ai-market-oracle/venv
/opt/ai-market-oracle/venv/bin/pip install -r /opt/ai-market-oracle/repo/requirements.txt
#  write /opt/ai-market-oracle/.env (chmod 600), then install the two files as above
```
