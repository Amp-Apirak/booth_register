#!/usr/bin/env bash
# Build + deploy booth_register to a k3s cluster that uses the Istio Gateway `ingressgateway`.
#   DOMAIN=event-bbk.com ./deploy/k8s/deploy.sh
# Images are built with podman and imported straight into k3s (no registry needed).
# Safe to re-run: secrets and gateway listeners are only created when missing.
set -euo pipefail

DOMAIN="${DOMAIN:?set DOMAIN, e.g. DOMAIN=event-bbk.com}"
NS=booth
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/deploy/k8s"
TAG="${TAG:-$(git -C "$ROOT" rev-parse --short HEAD)}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
export DOMAIN TAG
render() { envsubst '${DOMAIN} ${TAG}' < "$1"; }

echo "==> Build images (tag $TAG)"
podman build -t "localhost/booth-server:$TAG" "$ROOT/server"
podman build -t "localhost/booth-client:$TAG" \
  --build-arg NEXT_PUBLIC_API_URL="https://$DOMAIN" "$ROOT/client"
for img in booth-server booth-client; do
  podman save "localhost/$img:$TAG" | k3s ctr images import -
done

echo "==> Namespace, secrets, DB init scripts"
kubectl apply -f "$HERE/namespace.yaml"
if ! kubectl -n $NS get secret booth-db >/dev/null 2>&1; then
  kubectl -n $NS create secret generic booth-db \
    --from-literal=DB_USER=event_admin \
    --from-literal=DB_PASSWORD="$(openssl rand -hex 24)"
fi
if ! kubectl -n $NS get secret booth-server-env >/dev/null 2>&1; then
  DB_PASSWORD="$(kubectl -n $NS get secret booth-db -o jsonpath='{.data.DB_PASSWORD}' | base64 -d)"
  kubectl -n $NS create secret generic booth-server-env \
    --from-literal=PORT=3005 \
    --from-literal=NODE_ENV=production \
    --from-literal=DB_HOST=booth-postgres \
    --from-literal=DB_PORT=5432 \
    --from-literal=DB_USER=event_admin \
    --from-literal=DB_PASSWORD="$DB_PASSWORD" \
    --from-literal=DB_NAME=booth_register_db \
    --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
    --from-literal=CORS_ORIGIN="https://$DOMAIN,https://www.$DOMAIN"
  # SMTP_*: add later with `kubectl -n booth edit secret booth-server-env` + restart
fi
kubectl -n $NS create configmap booth-db-init \
  --from-file=01-schema.sql="$ROOT/database/schema.sql" \
  --from-file=02-seed.sql="$ROOT/database/seed.sql" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Gateway listeners for $DOMAIN"
listeners="$(kubectl -n istio-system get gateway ingressgateway -o jsonpath='{.spec.listeners[*].name}')"
add_listener() { # name host port [tls-secret]
  grep -qw "$1" <<<"$listeners" && return 0
  local l="{\"name\":\"$1\",\"hostname\":\"$2\",\"port\":$3,\"allowedRoutes\":{\"namespaces\":{\"from\":\"All\"}}"
  if [ -n "${4:-}" ]; then
    l="$l,\"protocol\":\"HTTPS\",\"tls\":{\"mode\":\"Terminate\",\"certificateRefs\":[{\"kind\":\"Secret\",\"group\":\"\",\"name\":\"$4\"}]}}"
  else
    l="$l,\"protocol\":\"HTTP\"}"
  fi
  kubectl -n istio-system patch gateway ingressgateway --type=json \
    -p "[{\"op\":\"add\",\"path\":\"/spec/listeners/-\",\"value\":$l}]"
}
add_listener http-booth       "$DOMAIN"     80
add_listener http-booth-www   "www.$DOMAIN" 80
add_listener https-booth      "$DOMAIN"     443 booth-tls
add_listener https-booth-www  "www.$DOMAIN" 443 booth-tls

echo "==> Apply manifests"
for f in tls postgres server client route backup; do
  render "$HERE/$f.yaml" | kubectl apply -f -
done
kubectl -n $NS rollout status statefulset/booth-postgres --timeout=180s
kubectl -n $NS rollout status deployment/booth-server --timeout=180s
kubectl -n $NS rollout status deployment/booth-client --timeout=180s

echo "==> Done. https://$DOMAIN  (cert status: kubectl -n istio-system get certificate booth-tls)"
echo "    First time: create an admin ->"
echo "    kubectl -n $NS exec -it deploy/booth-server -- node scripts/create-admin.js admin '<password>' Admin \"System Admin\""
