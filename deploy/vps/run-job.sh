#!/usr/bin/env bash
# Run one AI Market Oracle job on the VPS: morning | late | evening | weekly.
#
# morning, evening and weekly mirror .github/workflows/{morning,evening,weekly}.yml,
# minus the npm build: GitHub Pages rebuilds on every push to master via deploy.yml.
# late is the 10 AM run of the timing experiment (scripts/experiments.py).
#
# Usage: run-job.sh <morning|late|evening|weekly> [--at HH] [args for the main script]
#   --at HH   run only if the current America/New_York hour is HH. Cron on this box
#             runs in UTC, so each job is scheduled at both its EDT and its EST UTC
#             hour and this guard lets exactly one of the two through.
#   e.g. run-job.sh morning --date 2026-11-20 --models sonar-pro --overwrite
#        run-job.sh morning --dry-run          (calls the models, saves nothing)
#        run-job.sh late --dry-run             (the 10 AM run, saves nothing)
#        run-job.sh weekly --week 2026-W47 --force
#
# Installed at /opt/ai-market-oracle/bin/run-job.sh; source of truth is
# deploy/vps/run-job.sh in the repo (see deploy/vps/README.md).
set -uo pipefail

export TZ=America/New_York
BASE=/opt/ai-market-oracle
REPO=$BASE/repo
PY=$BASE/venv/bin/python
LOG_DIR=/var/log/ai-market-oracle

JOB=${1:?usage: run-job.sh <morning|late|evening|weekly> [--at HH] [args...]}
shift
if [ "${1:-}" = "--at" ]; then
  [ "$(date +%H)" = "${2:?--at needs an hour}" ] || exit 0
  shift 2
fi
case $JOB in morning|late|evening|weekly) ;; *) echo "unknown job: $JOB" >&2; exit 2 ;; esac

DATE="" DRY_RUN=0 prev=""
for arg in "$@"; do
  [ "$prev" = "--date" ] && DATE=$arg
  [ "$arg" = "--dry-run" ] && DRY_RUN=1
  prev=$arg
done
LABEL_DATE=${DATE:-$(date +%F)}

mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%F)-$JOB.log"
exec > >(tee -a "$LOG") 2>&1
find "$LOG_DIR" -name '20*.log' -mtime +90 -delete 2>/dev/null

# One job at a time (a manual rerun waits for a scheduled one, and vice versa).
exec 9>/run/lock/ai-market-oracle.lock
flock -w 900 9 || { echo "Another ai-market-oracle job is still running — giving up"; exit 1; }

echo "=== $JOB started $(date '+%F %T %Z') args: $*"
ERRORS=()

step() {  # step <name> <command...>: run it, record a failure, return its status
  local name=$1; shift
  echo "--- $name"
  "$@"
  local rc=$?
  [ $rc -eq 0 ] || ERRORS+=("$name failed (exit $rc)")
  return $rc
}
in_scripts() { (cd "$REPO/scripts" && "$@"); }

sync_public() { rm -rf public/data && cp -r data public/data; }

commit_and_push() {
  git add data/ public/data/
  if git diff --staged --quiet; then
    echo "No changes to commit"
  else
    git commit -q -m "$1" && echo "Committed: $1"
  fi
  # Push, retrying a few times; this also sends any earlier commit that failed to push.
  local i
  for i in 1 2 3; do
    if git pull -q --rebase --autostash origin master && git push -q origin master; then
      echo "Pushed to origin/master"
      return 0
    fi
    git rebase --abort >/dev/null 2>&1
    sleep 20
  done
  return 1
}

generate_job() {  # generate_job <step name> <commit message> [generate.py args...]
  local name=$1 message=$2; shift 2
  # generate.py reports failed models through GITHUB_OUTPUT, as it does in Actions.
  export GITHUB_OUTPUT
  GITHUB_OUTPUT=$(mktemp)
  # As in the workflow, a failed generate step skips everything after it.
  if step "$name" in_scripts "$PY" generate.py "$@" && [ $DRY_RUN -eq 0 ]; then
    if [ "$JOB" = morning ]; then
      step "Daily summary" in_scripts "$PY" summarize.py --daily ${DATE:+--date "$DATE"}
      step "Leaderboard participation" "$PY" -c \
        "import sys; sys.path.insert(0, 'scripts'); from score import update_leaderboard; update_leaderboard()"
    fi
    step "Sync data to public" sync_public
    step "Commit and push" commit_and_push "$message"
  fi
  FAILED_MODELS=$(sed -n 's/^failed_models=//p' "$GITHUB_OUTPUT" | tail -1)
  [ -n "$FAILED_MODELS" ] && ERRORS+=("models failed to generate predictions: $FAILED_MODELS")
  rm -f "$GITHUB_OUTPUT"
}

finish() {
  local status=OK
  if [ ${#ERRORS[@]} -gt 0 ]; then
    status="FAILED: ${ERRORS[*]}"
  fi
  echo "=== $JOB finished $(date '+%F %T %Z') — $status"
  echo "$(date '+%F %T %Z')  $JOB  $status" >> "$LOG_DIR/history.log"
  [ "$status" = OK ]
  exit $?
}

cd "$REPO" || { ERRORS+=("repo missing at $REPO"); finish; }
if ! git pull -q --rebase --autostash origin master; then
  git rebase --abort >/dev/null 2>&1
  ERRORS+=("git pull failed — ran on the local checkout")
fi

set -a
# shellcheck source=/dev/null
. "$BASE/.env"
set +a
export PYTHONUNBUFFERED=1

case $JOB in
  morning)
    generate_job "Generate predictions" "🤖 Morning predictions — $LABEL_DATE" "$@"
    ;;
  late)
    generate_job "10 AM experiment predictions" "🧪 10 AM experiment — $LABEL_DATE" --experiment late "$@"
    ;;
  evening)
    step "Score predictions" in_scripts "$PY" score.py "$@"
    step "Settle timing experiment" in_scripts "$PY" experiments.py ${DATE:+--date "$DATE"}
    step "Daily summary (post-scoring)" "$PY" scripts/summarize.py --daily --force ${DATE:+--date "$DATE"}
    step "Analytics" "$PY" scripts/analytics.py
    step "Sync data to public" sync_public
    step "Commit and push" commit_and_push "📊 Evening scores — $LABEL_DATE"
    ;;
  weekly)
    step "Weekly summary" in_scripts "$PY" summarize.py --weekly "$@"
    step "Sync data to public" sync_public
    step "Commit and push" commit_and_push "📋 Weekly report — $(date +%F)"
    ;;
esac

finish
