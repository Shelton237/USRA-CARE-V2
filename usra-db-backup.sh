#!/bin/bash
# =============================================================================
# USRA-CARE — Sauvegarde automatique MySQL → GitHub
# Cron : 0 2 * * *  (tous les jours à 02h00)
# Conserve les 10 sauvegardes les plus récentes
# =============================================================================

BACKUP_DIR="/var/backups/usra-care-db"
DB_USER="usra_v2"
DB_PASS="UsraV2@2026!"
DB_NAME="usra_backoffice"
DB_HOST="127.0.0.1"
MAX_BACKUPS=10
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
LOG="${BACKUP_DIR}/backup.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

cd "$BACKUP_DIR" || exit 1

log "========================================"
log "Debut sauvegarde — $TIMESTAMP"

# 1. Dump MySQL compressé
mysqldump \
  --user="$DB_USER" \
  "--password=$DB_PASS" \
  --host="$DB_HOST" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" 2>/dev/null | gzip -9 > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  log "ERREUR : fichier backup vide ou non créé"
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "OK Dump : $(basename $BACKUP_FILE) ($SIZE)"

# 2. Supprimer les plus anciens si > MAX_BACKUPS
EXISTING_COUNT=$(ls -1 backup_*.sql.gz 2>/dev/null | wc -l)
log "Backups existants avant nettoyage : $EXISTING_COUNT"

if [ "$EXISTING_COUNT" -gt "$MAX_BACKUPS" ]; then
  DELETE_COUNT=$(( EXISTING_COUNT - MAX_BACKUPS ))
  ls -1t backup_*.sql.gz | tail -n "$DELETE_COUNT" | while read -r OLD; do
    git rm --cached "$OLD" 2>/dev/null || true
    rm -f "$OLD"
    log "Supprime : $OLD"
  done
fi

# 3. Git commit + push
git add -A

KEPT=$(ls -1 backup_*.sql.gz 2>/dev/null | wc -l)
git commit -m "backup: ${TIMESTAMP} — ${SIZE} — ${KEPT}/${MAX_BACKUPS} fichiers" \
  --author="USRA Backup Bot <deploy@usra-care.com>"

git push origin db-backups

log "OK Push GitHub — branche db-backups"
log "Fin sauvegarde — $KEPT/${MAX_BACKUPS} sauvegardes conservees"
log "========================================"
