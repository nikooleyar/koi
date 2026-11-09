#!/bin/sh
# Build the frontend locally, copy code to the koi container, restart the service.
set -e
HOST=root@10.0.0.181
cd "$(dirname "$0")/.."
(cd src/frontend && npm run build)
ssh $HOST 'mkdir -p /opt/koi/src/backend /opt/koi/src/frontend/dist'
rsync -a --delete src/backend/ $HOST:/opt/koi/src/backend/
rsync -a --delete src/frontend/dist/ $HOST:/opt/koi/src/frontend/dist/
scp deploy/koi.service $HOST:/etc/systemd/system/koi.service
ssh $HOST 'set -e
[ -d /opt/koi/venv ] || python3 -m venv /opt/koi/venv
/opt/koi/venv/bin/pip install -q -r /opt/koi/src/backend/requirements.txt
systemctl daemon-reload && systemctl enable -q koi && systemctl restart koi'
echo "Deployed: https://goldfish.mulard-sunfish.ts.net:8443"
